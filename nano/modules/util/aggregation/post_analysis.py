#!/usr/bin/env python3
# These two lines does not pass the linter, but is required here to run
# visualization on remote server
# import matplotlib
# matplotlib.use("GTKAgg")
import logging
import os
from collections import OrderedDict

import matplotlib.pyplot as plt
import modules.keywords as KEY
import numpy as np
import pandas as pd
import seaborn as sns
from modules.util_logger import EmptyLogger
from scipy import stats
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.externals import joblib
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import MinMaxScaler


class PostAnalysisAggr:
    """
    Post analysis aggregation of link healthiness and performance
    """

    def __init__(
        self,
        logger_tag="Post",
        log_path_dir=None,
        log_file_postfix=None,
        printout=True,
        visualize=False,
        foldername=None,
    ):
        if log_path_dir is None:
            self.logger = EmptyLogger(logger_tag, printout=True)
        elif log_path_dir and log_file_postfix is None:
            logpath_r = "{0}/log/".format(log_path_dir)
            if not os.path.isdir(logpath_r):
                try:
                    os.makedirs(logpath_r)
                except BaseException:
                    logpath_r = log_path_dir
            self.logger = EmptyLogger(
                logger_tag,
                logPath="{0}/log/aggr_{1}.log".format(log_path_dir, logger_tag),
                printout=printout,
                printlevel=logging.INFO,
            )
        elif log_path_dir and log_file_postfix:
            logpath_r = "{0}/".format(log_path_dir)
            if not os.path.isdir(logpath_r):
                try:
                    os.makedirs(logpath_r)
                except BaseException:
                    logpath_r = log_path_dir
            self.logger = EmptyLogger(
                logger_tag,
                logPath="{0}/{1}_{2}.log".format(
                    log_path_dir, logger_tag, log_file_postfix
                ),
                printout=printout,
                printlevel=logging.INFO,
            )
        self.log_path_dir = log_path_dir
        self.log_file_postfix = log_file_postfix
        self.visualize = visualize
        self.foldername = foldername

    def get_feature_list(self, overview, link, data):
        """
        create a list of historical values for some overviews
        @param overview dict, the overview result of a link
        @param link string, the name of the specific link
        @param data dict, the json dictionary collected from mongoDB
        @return void
        """
        datalen = len(data)
        # go over all data from oldest to latest
        for index in range(datalen - 1, -1, -1):
            result = data[index][KEY.UDP].get(link, {})
            if not result:
                return
            # go through all keys
            for bikey in result:
                # for bi-directional labels and distance
                if bikey in [KEY.A2Z, KEY.Z2A]:
                    if bikey not in overview[link]:
                        overview[link][bikey] = {}
                    for unikey in result[bikey]:
                        # for uni-directional labels, parameter averages, mcs p90
                        if not (unikey in KEY.DA_KEY_FEATURE + KEY.DA_SEL_FEATURE):
                            continue
                        if unikey not in overview[link][bikey]:
                            overview[link][bikey][unikey] = []
                        overview[link][bikey][unikey].append(result[bikey][unikey])

    def time_aggregation(self, data):
        """
        compute the summed info for list of historical overviews, also finds the
        links with imbalanced metrics.
        @param data list, sorted from latest to oldest overviews
        @return overview dict overview_label summary results.
        """
        overview = OrderedDict()
        # generate all keys
        for each in data:  # list entry
            for key in each[KEY.UDP]:  # dict entry
                if "link-" in key and key not in overview:
                    overview[key] = OrderedDict()
        # go over all links
        for link in overview:
            num_imbalance = 0
            self.get_feature_list(overview, link, data)
            a2ztable = self.single_link_health_perf_aggregation(overview[link], KEY.A2Z)
            z2atable = self.single_link_health_perf_aggregation(overview[link], KEY.Z2A)
            # If both single link aggregation is available, calculate correlation matrix
            if a2ztable is not None and z2atable is not None:
                # Pick the 4 most important features to compare.
                a2ztable = a2ztable[KEY.DA_BIDIR_FEATURE]
                z2atable = z2atable[KEY.DA_BIDIR_FEATURE]
                for col in a2ztable.columns:
                    diff = (a2ztable[col] - z2atable[col]).dropna()
                    # Not enough samples to conduct the test.
                    if diff.shape[0] < KEY.DA_SHAPIRO_THRESH:
                        continue
                    # If the 2 distribution's difference passes shapiro wilks test,
                    # then use parametric paired t test. If it doesn't, uses
                    # wilcoxon signed rank test.
                    stat, p_val = stats.shapiro(diff)
                    if p_val >= KEY.DA_ALPHA:
                        tstat, p = stats.ttest_rel(
                            a2ztable[col], z2atable[col], nan_policy="omit"
                        )
                    else:
                        tstat, p = stats.wilcoxon(a2ztable[col], z2atable[col])
                    if p < KEY.DA_ALPHA:
                        num_imbalance += 1
                # If all the features are imbalanced, the link is marked in overview.
                overview[key]["imbalance"] = num_imbalance == len(KEY.DA_BIDIR_FEATURE)
        return overview

    def mad_based_outlier(self, data, thresh=KEY.DA_MAD_THRESH):
        """
        Find the outliers in a list of data using median absolute deviation.
        @param data list of float, the list of data to be analyzed
        @param thresh float, threshold of filtering, the larger the threshold the
        less outliers will be picked out. 3.5 is normally used as empirically good
        estimate
        @return np array of int, returns the outlier indeces
        """
        data_arr = np.asarray(data)
        if data_arr.dtype != "float64" and data_arr.dtype != "int64":
            self.logger.error("mad_based_outlier has invalid input")
            raise TypeError("Feature list not of correct type!")
        median = np.nanmedian(data_arr)
        diff = np.where(
            np.isnan(data_arr), float("nan"), np.absolute(data_arr - median)
        )
        med_abs_deviation = np.nanmedian(diff)

        robust_z_score = np.where(
            np.isnan(diff), np.inf, KEY.DA_P75_NORMAL_DIST * diff / med_abs_deviation
        )

        return np.flatnonzero(robust_z_score > thresh)

    def qualify_thresh(self, data, up_th=np.inf, lw_th=np.NINF):
        """
        Calculate the percent of instances in a list that is within a threshold
        @param data: list of float, the data list to be calculated
        @param up_th: float, upper limit of the qualified area, inclusive
        @param lw_th: float, lower limit of the qualified area, inclusive
        @return list of int, indeces at which the value failed the threshold.
        """

        data_arr = np.asarray(data)
        if data_arr.dtype != "float64" and data_arr.dtype != "int64":
            self.logger.error("qualify_thresh has invalid input")
            raise TypeError("Feature list not of correct type!")
        return np.flatnonzero(
            np.logical_not(np.logical_and(data_arr <= up_th, data_arr >= lw_th))
        )

    def single_link_health_perf_table(self, result, dir):
        """
        Create a table of all the test results, each test result has
        a number of features
        @param result: dict, data collection of a single link
        @param dir: string, direction of link
        @return pd.DataFrame, a dataframe of collected result, or if there are
        fields missing in the data collected, an empty dataframe
        """
        ordered = OrderedDict()
        try:
            target_rate = np.char.rstrip(result[dir][KEY.TARGET_BITRATE], "M").astype(
                np.float
            )
            for key in KEY.DA_KEY_FEATURE + KEY.DA_SEL_FEATURE:
                if key == KEY.IPERF_DTL_AVG or key == KEY.IPERF_DTL_STD:
                    ordered[key] = result[dir][key] / target_rate
                elif key == KEY.TARGET_BITRATE:
                    continue
                else:
                    ordered[key] = result[dir][key]
        except KeyError:
            self.logger.error("Missing related parameters")
            return pd.DataFrame()
        return pd.DataFrame(ordered, columns=ordered.keys())

    def univariate_outlier(self, table):
        """
        Detect outlier based on univariate outlier detection.
        The data instances with too many outlier features are considered
        outlier in general. Primary feature has more weight than secondary.
        It takes 1 outlier primary feature and 4 outlier secondary feature to be
        identified as outlier
        @param table: pd.DataFrame, data collection of 1 link, all the tests.
        @return list of int: indeces of which are outliers
        """

        dlen = len(table[KEY.DA_KEY_FEATURE[0]])
        count = np.zeros(dlen)
        # Here, the outlier detection has a # of outlier parameter threshold.
        # Any instance with 3 or more outliers is considered outlier.
        # If 1 prioritized feature is outlier, the instance is also outlier.

        for unikey in table.columns:
            # Prioritized features count as 3 features
            # mcs_p90 has special treatment
            try:
                if unikey == KEY.MCS_P90:
                    ind = self.qualify_thresh(
                        table[unikey], lw_th=KEY.THRESH_IPERF_MCS_OKAY_L
                    )
                    count[ind] += KEY.DA_OUTLIER_THRESH
                elif unikey == KEY.IPERF_DTL_AVG:
                    ind = self.qualify_thresh(
                        table[unikey], lw_th=KEY.THRESH_IPERF_WARNING
                    )
                    count[ind] += KEY.DA_OUTLIER_THRESH
                elif unikey == KEY.PERE6_AVG:
                    ind = self.qualify_thresh(table[unikey], up_th=2.0)
                    count[ind] += KEY.DA_OUTLIER_THRESH
                else:
                    ind = self.mad_based_outlier(table[unikey])
                    count[ind] += 1
            except TypeError:
                raise TypeError("One of the column is invalid")
        return np.flatnonzero(count >= KEY.DA_OUTLIER_THRESH)

    def single_link_health_perf_aggregation(self, result, dir):
        """
        A tool to determine and visualize link healthiness based on outliers.
        Returns outliers with low MCS level or 3 other parameters that are outliers.
        The outliers in each parameter is marked red, and rows with many outliers
        can be considered as anomalies.
        @param result: dict, The overview of a single link
        @param dir: string, The direction of a specific link, a2z or z2a
        """
        table = self.single_link_health_perf_table(result, dir)
        if table.empty:
            if result:
                result.pop(dir)
            return None
        outliers = self.univariate_outlier(table)
        result[dir]["outlier_rate"] = (
            len(outliers) / float(len(table.index)) if len(table.index) > 0 else np.nan
        )
        result[dir].pop(KEY.TARGET_BITRATE, None)
        new_table = table.drop(outliers)
        self.mean_std_aggr(new_table, result, dir)
        return table

    def mean_std_aggr(self, table, result, dir):
        """
        Get mean and standard deviation of link measurements aggregated across
        time. Standard deviations have special operations.
        @param table: pd.DataFrame, record of each link across time aggregation
        @param result: dict, saves aggregation for all links
        @param dir: string, direction of the link
        """
        for key in table.columns:
            if np.isnan(table[key]).all():
                self.logger.error("One feature has no value, remove link")
                result.pop(dir)
                return
            if key.endswith("_avg") or key.endswith("_p90"):
                mean = np.nanmean(table[key])
                result[dir][key] = mean
                std_key = key.replace("_avg", "_std").replace("_p90", "_std")
                avg_square = np.square(table[key])
                var = np.square(table[std_key])
                result[dir][std_key] = (np.nanmean(avg_square + var) - mean ** 2) ** 0.5
            else:
                result[dir][key] = np.nanmean(table[key])

    def link_clustering(self, overview):
        """
        Takes time aggregation results and performs link aggregation
        @param overview: dict, the result of time aggregation
        @return link of int, the classification result
        """
        important_df, sum_df, link_dir = self.aggregate_links(overview)
        # still testing best clustering number, once decided, the number will
        # be added to keywords.py
        labels = self.pca_k_means(important_df, KEY.DA_CLUSTER_NUM)
        label_col = pd.DataFrame({"label": labels})
        sum_df = sum_df.join(label_col)
        sum_df = sum_df.set_index(["label"])
        centroids = pd.concat(
            [sum_df.loc[0].mean(), sum_df.loc[1].mean(), sum_df.loc[2].mean()], axis=1
        )
        if self.foldername:
            excel_name = os.path.join(self.foldername, "centroids.xlsx")
            centroids.to_excel(excel_name, sheet_name="Sheet1")
        corr0 = sum_df.loc[0].corr()
        corr1 = sum_df.loc[1].corr()
        corr2 = sum_df.loc[2].corr()
        if self.foldername:
            plt.figure()
            sns.heatmap(corr0, annot=True)
            plt.savefig(os.path.join(self.foldername, "group0_corr.png"))
            plt.close()
            plt.figure()
            sns.heatmap(corr1, annot=True)
            plt.savefig(os.path.join(self.foldername, "group1_corr.png"))
            plt.close()
            plt.figure()
            sns.heatmap(corr2, annot=True)
            plt.savefig(os.path.join(self.foldername, "group2_corr.png"))
            plt.close()
        old_link = None
        old_label = None
        diff_cluster = []
        for index in range(len(link_dir)):
            [link, dir] = link_dir[index].split("@")
            if link == old_link:
                if labels[index] != old_label:
                    diff_cluster.append(link)
            else:
                old_link = link
                old_label = labels[index]
            overview[link][dir]["cluster_label"] = labels[index]
        self.logger.info(len(diff_cluster))
        if self.visualize:
            self.visualize_cluster(important_df, labels)
        return labels, diff_cluster

    def aggregate_links(self, overview):
        """
        Use time aggregation result to come up with link dataframe
        @param overview: dict, the result of time aggregation
        @return tuple of pd.DataFrame and list of string, pd.DataFrame has all
        the link data, list has all the link names
        """
        bidir_df = pd.DataFrame()
        sum_df = pd.DataFrame()
        instance_list = []
        for link in overview:
            bidir_link = {}
            for dir in [KEY.A2Z, KEY.Z2A]:
                if not overview[link].get(dir):
                    continue
                instance_list.append(link + "@" + dir)
                bidir_link.update(
                    {
                        key + dir: value
                        for (key, value) in overview[link][dir].items()
                        if not key.endswith("_std")
                    }
                )
                dir_df = pd.DataFrame([overview[link][dir]])
                sum_df = sum_df.append(dir_df, ignore_index=True)
            bidir_df = bidir_df.append(pd.DataFrame([bidir_link]), ignore_index=True)
        bidir_df = bidir_df.drop(["outlier_ratea2z"], axis=1)
        bidir_df = bidir_df.drop(["outlier_ratez2a"], axis=1)
        corr_matrix = bidir_df.corr()
        indices = np.where(corr_matrix.abs() >= KEY.DA_SIG_CORR_THRESH)
        # The same directional correlation has row and col number with same
        # parity, the bi-direcitional correlation has that with different parity.
        same_dir_high_corr = [
            (corr_matrix.index[row], corr_matrix.columns[col])
            for row, col in zip(*indices)
            if row < col and (row - col) % 2 == 0
        ]
        bi_dir_high_corr = [
            (corr_matrix.index[row], corr_matrix.columns[col])
            for row, col in zip(*indices)
            if row < col and (col - row) % 2 == 1
        ]
        self.logger.info("Same direction high correlation features:")
        self.logger.info(same_dir_high_corr)
        self.logger.info("Bi directional high correlation features:")
        self.logger.info(bi_dir_high_corr)
        if self.visualize or self.foldername:
            plt.figure()
            sns.heatmap(corr_matrix, annot=True)
            if self.foldername:
                plt.savefig(os.path.join(self.foldername, "all_correlation.png"))
            if self.visualize:
                plt.show()

        # IMPORTANT: Drops irrelevant features to achieve better clustering
        # result
        important_df = sum_df.drop(KEY.DA_IRRELEVANT_FEATURE, axis=1)
        return (important_df, sum_df, instance_list)

    def nan_proof_k_means(self, df, num_clusters):
        """
        This is the k means version that deals with nan values.
        Because PCA is barely nan value compatible, PCA is not included in the
        function.
        This function is currently not used because the link aggregation has
        no nan values.
        @param df: pd.DataFrame, dataframe that contains link aggregation data
        @param num_clusters: int, number of clusters
        @return link of int, the classification result
        """
        scaler = MinMaxScaler()
        scaled_df = scaler.fit_transform(df)

        missing = np.isnan(scaled_df)
        if np.any(np.all(missing, axis=0)):
            # There is one col with all NaN values, can't conduct clustering
            self.logger.error("k means invalid input")
            raise ValueError("All NaN in one column, can't perform clustering")
        elif np.all(~missing):
            # No NaN value, one iteration of KMeans
            kmeans = KMeans(n_clusters=num_clusters)
            labels = kmeans.fit_predict(scaled_df)
        else:
            # NaN values exists, use imputation to fill in
            mu = np.nanmean(scaled_df, 0, keepdims=1)
            filled_df = np.where(missing, mu, scaled_df)

            prev_centroids = []
            prev_labels = []
            for iter in range(KEY.DA_IMPUTATION_ITER):
                if iter > 0:
                    # Initialize KMeans with previous centroids
                    # Converge Faster
                    kmeans = KMeans(n_clusters=num_clusters, init=prev_centroids)
                else:
                    # random initialization
                    kmeans = KMeans(n_clusters=num_clusters, n_jobs=-1)

                labels = kmeans.fit_predict(filled_df)
                centroids = kmeans.cluster_centers_

                # replace previous missing values with centroids
                filled_df[missing] = centroids[labels][missing]

                # if converge, return
                if iter > 0 and np.all(labels == prev_labels):
                    break

                prev_labels = labels
                prev_centroids = centroids

        idx = np.argsort(kmeans.cluster_centers_.sum(axis=1))
        lut = np.zeros_like(idx)
        lut[idx] = np.arange(num_clusters)
        return lut[labels]

    def pca_k_means(self, df, num_clusters, use_save=False):
        """
        K Means algorithm that incoporates scaling and pca analysis. The
        function scales the data with minmaxscaler first, and then uses pca
        component analysis to reduce the dimensionality of the data. Finally,
        it does k means on the scaled, reduced dimensionality data.
        This k means clustering does not deal with nan value.
        @param df: pd.DataFrame, dataframe that contains link aggregation data
        @param num_clusters: int, number of clusters
        @param use_save: bool, whether use previously saved model to predict
        data, False to generate new clustering model.
        @return link of int, the classification result
        """
        filename_minmax = "minmax.sav"
        filename_pca = "pca.sav"
        filename_kmeans = "kmeans.sav"
        if use_save and self.foldername:
            scaler = joblib.load(os.path.join(self.foldername, filename_minmax))
            scaled_df = scaler.transform(df)
            pca = joblib.load(os.path.join(self.foldername, filename_pca))
            ldim_df = pca.transform(df)
            kmeans = joblib.load(os.path.join(self.foldername, filename_kmeans))
            labels = kmeans.transform(df)
        else:
            scaler = MinMaxScaler()
            scaled_df = scaler.fit_transform(df)
            pca = PCA(n_components=KEY.DA_PCA_NUM)
            ldim_df = pca.fit_transform(scaled_df)
            kmeans = KMeans(n_clusters=num_clusters)
            labels = kmeans.fit_predict(ldim_df)
            if self.foldername:
                joblib.dump(scaler, os.path.join(self.foldername, filename_minmax))
                joblib.dump(pca, os.path.join(self.foldername, filename_pca))
                joblib.dump(kmeans, os.path.join(self.foldername, filename_kmeans))

        # This added part is to make sure the labeling result is consistent
        # across multiple runs of the same dataset
        # lut: look up table
        idx = np.argsort(kmeans.cluster_centers_.sum(axis=1))
        lut = np.zeros_like(idx)
        lut[idx] = np.arange(num_clusters)
        return lut[labels]

    def choose_k_silhouette(self, df):
        """
        Silhouette analysis on clustering number selection
        The higher the analysis score, the more suitable the cluster number.
        @param df: pd.DataFrame, contains data instances with 9 parameters
        """
        self.logger.info("Silhouette test")
        # Scale the variables for better clustering result
        scaler = MinMaxScaler()
        scaled_df = scaler.fit_transform(df)

        for num_cluster in range(2, 6):
            self.logger.info(num_cluster)
            labels = self.pca_k_means(df, num_cluster)

            silhouette_avg = silhouette_score(scaled_df, labels)
            self.logger.info(silhouette_avg)

    def visualize_cluster(self, df, labels):
        """
        Tool to visualize clustering distribution.
        @param df: pd.DataFrame, contains data instances with 9 parameters
        @param labels: list of string, names of each parameter
        @return void
        """
        # Scale the variables for better clustering result
        # Scale the variables for better clustering result
        scaler = MinMaxScaler()
        scaled_df = scaler.fit_transform(df)

        pca = PCA()
        # ldim_df: The dataframe after PCA transform, the columns are sorted by
        # variance.
        ldim_df = pca.fit_transform(scaled_df)
        self.logger.info(pca.explained_variance_ratio_.cumsum())
        # Choose the first 2 columns for visualization. Can also choose 3 columns.
        score = ldim_df[:, 0:2]
        # Correlation between original features and new components.
        coeff = np.transpose(pca.components_[0:2, :])
        plt.figure()
        plt.xlim(-1, 1)
        plt.ylim(-1, 1)
        plt.xlabel("PC{}".format(1))
        plt.ylabel("PC{}".format(2))
        plt.grid()

        xs = score[:, 0]
        ys = score[:, 1]
        n = coeff.shape[0]
        scalex = 1.0 / (xs.max() - xs.min())
        scaley = 1.0 / (ys.max() - ys.min())
        for num in range(len(xs)):
            if labels[num] == 0:
                plt.scatter(xs[num] * scalex, ys[num] * scaley, c="r", marker="+")
            elif labels[num] == 1:
                plt.scatter(xs[num] * scalex, ys[num] * scaley, c="g", marker="o")
            else:
                plt.scatter(xs[num] * scalex, ys[num] * scaley, c="b", marker="x")
        for i in range(n):
            plt.arrow(0, 0, coeff[i, 0], coeff[i, 1], color="r", alpha=0.5)
            plt.text(
                coeff[i, 0] * 1.15,
                coeff[i, 1] * 1.15,
                df.columns[i],
                color="g",
                ha="center",
                va="center",
            )
        if self.foldername:
            plt.savefig(os.path.join(self.foldername, "cluster_visualization.png"))
        plt.show()
