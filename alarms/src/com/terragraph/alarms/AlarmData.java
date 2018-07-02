/*
 * Copyright (c) 2018-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.alarms;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.Gson;
import com.terragraph.alarms.Alarm.AlarmSeverity;
import com.terragraph.alarms.Alarm.AlarmType;
import com.terragraph.alarms.Alarm.EventType;
import com.terragraph.alarms.Config.AlarmConfig;
import com.terragraph.alarms.Config.AlarmConfig.AlarmParams;
import com.terragraph.alarms.Topology.Link;
import com.terragraph.alarms.Topology.Node;

/**
 * Container for all alarm data.
 */
public class AlarmData implements Serializable {
    private static final long serialVersionUID = -2247558422577176639L;
    private static final Logger logger = LoggerFactory.getLogger(AlarmData.class);

    /** Alarm wrapper. */
    private static class AlarmWrapper implements Serializable {
        private static final long serialVersionUID = -3295209031368110880L;

        /** Interface for returning whether an alarm condition is met. */
        public interface AlarmTrigger {
            public boolean validate(AlarmParams params);
        }

        /** Interface for returning text descriptions for an alarm. */
        public interface AlarmText {
            public String getDescription(AlarmParams params);
        }

        /** The event type. */
        private final EventType eventType;

        /** The alarm text callback. */
        private final AlarmText text;

        /** The number of consecutive polls for which each configured alarm condition was met. */
        private final long[] consecutivePolls;

        /** The last alarm that was sent (or null). */
        private Alarm lastAlarm;

        /** The index into {@link #consecutivePolls} for the last alarm that was sent (or -1). */
        private int lastAlarmIndex = -1;

        /**
         * Constructor.
         * @param eventType The event type
         * @param alarmCount The number of configured alarms
         * @param text The alarm description callback
         */
        public AlarmWrapper(EventType eventType, int alarmCount, AlarmText text) {
            this.consecutivePolls = new long[alarmCount];
            this.eventType = eventType;
            this.text = text;
        }

        /**
         * Update the alarm with a new trigger.
         * @param allAlarmParams All alarm configurations
         * @param repeatIntervalSeconds The interval at which the alarm should be repeated if still active
         * @param trigger The trigger determining whether the alarm condition is met
         * @return A new alarm that should be fired, or null
         */
        public Alarm update(AlarmParams[] allAlarmParams, int repeatIntervalSeconds, AlarmTrigger trigger) {
            // Update consecutive poll counters
            for (int i = 0; i < allAlarmParams.length; i++) {
                AlarmParams params = allAlarmParams[i];
                if (trigger.validate(params)) {
                    consecutivePolls[i]++;
                } else {
                    consecutivePolls[i] = 0;
                }
            }

            // Check which configured alarm should be active (if any; highest take priority)
            int alarmIndex = -1;
            for (int i = allAlarmParams.length - 1; i >= 0; i--) {
                AlarmParams params = allAlarmParams[i];
                if (consecutivePolls[i] >= params.consecutivePolls) {
                    alarmIndex = i;
                    break;
                }
            }

            // Fire the appropriate alarm
            Alarm newAlarm = null;
            if (alarmIndex != -1) {
                // The alarm should be active
                AlarmParams params = allAlarmParams[alarmIndex];
                if (lastAlarmIndex == -1) {
                    // No alarm is currently active - create a new alarm
                    lastAlarm = newAlarm = new Alarm(params.alarmSeverity, eventType, text.getDescription(params));
                } else if (lastAlarmIndex == alarmIndex) {
                    // This is the same as the active alarm - repeat at regular intervals
                    if (lastAlarm.getElapsedSeconds() >= repeatIntervalSeconds) {
                        lastAlarm = newAlarm = lastAlarm.copy(null, null, AlarmType.RESEND);
                    }
                } else {
                    // This is different from the current alarm - derive a new one
                    lastAlarm = newAlarm = lastAlarm.copy(
                        params.alarmSeverity, text.getDescription(params), AlarmType.RAISE
                    );
                }
            } else {
                // The alarm should NOT be active
                if (lastAlarmIndex != -1) {
                    // The alarm is currently active - cease it
                    newAlarm = lastAlarm.copy(AlarmSeverity.INFO, "", AlarmType.CEASE);
                    lastAlarm = null;
                }
            }
            lastAlarmIndex = alarmIndex;
            return newAlarm;
        }
    }

    /** The alarm config. */
    private AlarmConfig config;

    /** Alarm for network-wide DN disruption. */
    private AlarmWrapper networkDnDown;

    /** Alarm for network-wide CN disruption. */
    private AlarmWrapper networkCnDown;

    /** Alarms for individual DN disruption. */
    private Map<String, AlarmWrapper> nodeDnDown = new HashMap<String, AlarmWrapper>();

    /** Alarms for individual POP Primary-DN disruption. */
    private Map<String, AlarmWrapper> nodePopPrimaryDown = new HashMap<String, AlarmWrapper>();

    /** Alarms for DN-to-DN link disruption. */
    private Map<String, AlarmWrapper> linkDn2DnDown = new HashMap<String, AlarmWrapper>();

    /** Alarm for primary controller unreachability. */
    private AlarmWrapper primaryControllerDown;

    /**
     * Initialize the alarm data.
     * @param config The alarm configuration
     */
    public AlarmData(AlarmConfig config) {
        this.config = config;
    }

    /**
     * Updates alarm data assuming the primary controller is down (i.e. the topology can't be polled).
     * @param name The endpoint name
     * @return A list of alarms to send
     */
    public List<Alarm> update(String name) {
        List<Alarm> alarms = new ArrayList<>();

        // Primary controller alarms
        if (primaryControllerDown == null) {
            primaryControllerDown = new AlarmWrapper(
                EventType.CONTROLLER_PRIMARY,
                config.primaryControllerDown.length,
                (AlarmWrapper.AlarmText & Serializable) params -> String.format(
                    "%s: Primary controller is offline for at least %d polls.",
                    name,
                    params.consecutivePolls
                )
            );
        }
        append(alarms, primaryControllerDown.update(
            config.primaryControllerDown, config.repeatIntervalSeconds, params -> true)
        );

        return alarms;
    }

    /**
     * Updates all alarm data with the newly-polled topology.
     * @param name The endpoint name
     * @param topology The newly-polled topology
     * @return A list of alarms to send
     */
    public List<Alarm> update(String name, Topology topology) {
        List<Alarm> alarms = new ArrayList<>();
        int dnCount = 0, cnCount = 0, dnsDown = 0, cnsDown = 0;
        Set<String> dnSet = new HashSet<>();

        // Node-specific alarms
        for (Node node : topology.nodes) {
            if (node.isDN()) {
                // Bump counters
                dnCount++;
                if (!node.isAlive()) {
                    dnsDown++;
                }
                dnSet.add(node.name);

                // DN alarms
                if (node.isAlive()) {
                    // Node is alive - if an alarm exists, update it then delete it, otherwise do nothing
                    AlarmWrapper wrapper = nodeDnDown.remove(node.name);
                    if (wrapper != null) {
                        append(alarms, wrapper.update(
                            config.nodeDnDown, config.repeatIntervalSeconds, params -> false)
                        );
                    }
                } else {
                    // Node is dead - initialize alarm data if needed, then update it
                    AlarmWrapper wrapper = nodeDnDown.computeIfAbsent(node.name,
                        k -> new AlarmWrapper(
                            EventType.NODE_DN,
                            config.nodeDnDown.length,
                            (AlarmWrapper.AlarmText & Serializable) params -> String.format(
                                "%s: DN '%s' is offline for at least %d polls.",
                                name,
                                node.name,
                                params.consecutivePolls
                            )
                        )
                    );
                    append(alarms, wrapper.update(config.nodeDnDown, config.repeatIntervalSeconds, params -> true));
                }

                // POP Primary-DN alarms
                if (node.pop_node && node.is_primary) {
                    if (node.isAlive()) {
                        // Node is alive - if an alarm exists, update it then delete it, otherwise do nothing
                        AlarmWrapper wrapper = nodePopPrimaryDown.remove(node.name);
                        if (wrapper != null) {
                            append(alarms, wrapper.update(
                                config.nodePopPrimaryDown, config.repeatIntervalSeconds, params -> false)
                            );
                        }
                    } else {
                        // Node is dead - initialize alarm data if needed, then update it
                        AlarmWrapper wrapper = nodePopPrimaryDown.computeIfAbsent(node.name,
                            k -> new AlarmWrapper(
                                EventType.NODE_POP,
                                config.nodePopPrimaryDown.length,
                                (AlarmWrapper.AlarmText & Serializable) params -> String.format(
                                    "%s: POP Primary-DN '%s' is offline for at least %d polls.",
                                    name,
                                    node.name,
                                    params.consecutivePolls
                                )
                            )
                        );
                        append(alarms, wrapper.update(
                            config.nodePopPrimaryDown, config.repeatIntervalSeconds, params -> true)
                        );
                    }
                }
            } else if (node.isCN()) {
                // Bump counters
                cnCount++;
                if (!node.isAlive()) {
                    cnsDown++;
                }
            }
        }

        // Network-wide node alarms
        int dnDownPct = (dnCount == 0) ? 0 : dnsDown * 100 / dnCount;
        int cnDownPct = (cnCount == 0) ? 0 : cnsDown * 100 / cnCount;
        if (networkDnDown == null) {
            networkDnDown = new AlarmWrapper(
                EventType.NETWORK_DN,
                config.networkDnDown.length,
                (AlarmWrapper.AlarmText & Serializable) params -> String.format(
                    "%s: %d%% of DNs are offline.",
                    name,
                    params.networkDownPercent
                )
            );
        }
        append(alarms, networkDnDown.update(
            config.networkDnDown, config.repeatIntervalSeconds, params -> (dnDownPct >= params.networkDownPercent))
        );
        if (networkCnDown == null) {
            networkCnDown = new AlarmWrapper(
                EventType.NETWORK_CN,
                config.networkCnDown.length,
                (AlarmWrapper.AlarmText & Serializable) params -> String.format(
                    "%s: %d%% of CNs are offline.",
                    name,
                    params.networkDownPercent
                )
            );
        }
        append(alarms, networkCnDown.update(
            config.networkCnDown, config.repeatIntervalSeconds, params -> (cnDownPct >= params.networkDownPercent))
        );

        // Link-specific alarms
        for (Link link : topology.links) {
            if (!link.isWireless()) {
                continue;  // skip wired links
            }
            if (!dnSet.contains(link.a_node_name) || !dnSet.contains(link.z_node_name)) {
                continue;  // skip non DN-to-DN links
            }

            // DN-to-DN link alarms
            if (link.is_alive) {
                // Link is alive - if an alarm exists, update it then delete it, otherwise do nothing
                AlarmWrapper wrapper = linkDn2DnDown.remove(link.name);
                if (wrapper != null) {
                    append(alarms, wrapper.update(config.linkDn2DnDown, config.repeatIntervalSeconds, params -> false));
                }
            } else {
                // Link is dead - initialize alarm data if needed, then update it
                AlarmWrapper wrapper = linkDn2DnDown.computeIfAbsent(link.name,
                    k -> new AlarmWrapper(
                        EventType.LINK_DN2DN,
                        config.linkDn2DnDown.length,
                        (AlarmWrapper.AlarmText & Serializable) params -> String.format(
                            "%s: Link '%s' is offline for at least %d polls.",
                            name,
                            link.name,
                            params.consecutivePolls
                        )
                    )
                );
                append(alarms, wrapper.update(config.linkDn2DnDown, config.repeatIntervalSeconds, params -> true));
            }
        }

        // Primary controller alarms
        // Assume the controller is online because the topology was received
        if (primaryControllerDown != null) {
            append(alarms, primaryControllerDown.update(
                config.primaryControllerDown, config.repeatIntervalSeconds, params -> false)
            );
        }

        return alarms;
    }

    /**
     * Append the given alarm to the list if non-null.
     * @param alarms The list of alarms
     * @param alarm The alarm to append (possibly null)
     */
    private void append(List<Alarm> alarms, Alarm alarm) {
        if (alarm != null) {
            alarms.add(alarm);
        }
    }

    /**
     * Serializes the AlarmData object to the given file (in binary format).
     * @param f The file to write the serialized AlarmData object to
     * @throws IOException
     */
    public void writeToFile(File f) throws IOException {
        try (ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream(f))) {
            oos.writeObject(this);
        }
    }

    /**
     * Deserializes the AlarmData object from the given file (in binary format).
     * @param f The file holding the serialized AlarmData object
     * @param config The new alarm configuration (or null to use the existing one)
     * @return The deserialized AlarmData object
     * @throws IOException
     * @throws ClassNotFoundException
     */
    public static AlarmData readFromFile(File f, AlarmConfig newConfig) throws IOException, ClassNotFoundException {
        AlarmData alarmData;
        try (ObjectInputStream ois = new ObjectInputStream(new FileInputStream(f))) {
            alarmData = (AlarmData) ois.readObject();
        }

        // If overriding the existing config, warn if the configs mismatch
        if (newConfig != null) {
            String oldConfigJson = new Gson().toJson(alarmData.config);
            String newConfigJson = new Gson().toJson(newConfig);
            if (!oldConfigJson.equals(newConfigJson)) {
                logger.warn("Alarm configuration has changed! Cached alarm data may be outdated.");
            }

            alarmData.config = newConfig;
        }

        return alarmData;
    }
}
