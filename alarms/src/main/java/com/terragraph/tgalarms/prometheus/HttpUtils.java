/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.tgalarms.prometheus;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

import com.google.common.net.InetAddresses;

/**
 * HTTP-related utilities.
 */
public class HttpUtils {
	/** Send a POST request to the given URL. */
	public static String sendPostRequest(URL url, String postData, String contentType) throws IOException {
		// Open connection
		HttpURLConnection conn = (HttpURLConnection) url.openConnection();
		conn.setConnectTimeout(5000);
		conn.setReadTimeout(10000);
		conn.setUseCaches(false);

		// Set POST headers
		byte[] postDataBytes = postData.getBytes(StandardCharsets.UTF_8.name());
		conn.setRequestMethod("POST");
		conn.setRequestProperty("Content-Type", contentType);
		conn.setRequestProperty("Content-Length", String.valueOf(postDataBytes.length));
		conn.setDoOutput(true);
		conn.getOutputStream().write(postDataBytes);

		// Read response
		try (InputStream in = conn.getInputStream()) {
			BufferedReader rd = new BufferedReader(new InputStreamReader(in));
			StringBuilder sb = new StringBuilder();
			int c;
			while ((c = rd.read()) != -1) {
				sb.append((char) c);
			}
			return sb.toString();
		}
	}

	/** Check if the given string is an IPv6 address. */
	public static boolean isIPv6Address(String ip) {
		try {
			return InetAddresses.forString(ip).getAddress().length == 16;
		} catch (IllegalArgumentException e) {
			return false;
		}
	}
}
