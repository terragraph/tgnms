/*
 * Copyright (c) 2018-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.alarms;

import java.io.Serializable;

/**
 * Alarm structure.
 */
public class Alarm implements Serializable {
    private static final long serialVersionUID = -2180919787039087401L;

    /** Alarm severity level. */
    public enum AlarmSeverity { INFO, WARN, CRIT }

    /** Alarm event type. */
    public enum EventType {
        HEARTBEAT(0),
        NETWORK_DN(1),
        NETWORK_CN(2),
        NODE_DN(3),
        NODE_POP(4),
        LINK_DN2DN(5),
        CONTROLLER_PRIMARY(6);

        /** A unique identifier for this event type. */
        private final int id;

        /** Constructor. */
        EventType(int id) { this.id = id; }

        /** Returns the unique event identifier. */
        public int getId() { return id; }
    }

    /** Alarm type. */
    public enum AlarmType { RAISE, CEASE, RESEND }

    /** The alarm ID prefix. */
    private static final String ID_PREFIX = "TG";

    /** The fixed alarm ID for heartbeats. */
    private static final String HEARTBEAT_ID = "heartbeat";

    /** The alarm ID. */
    private final String id;

    /** The timestamp (Unix time). */
    private final long ts;

    /** The alarm severity. */
    private final AlarmSeverity severity;

    /** The type of event. */
    private final EventType eventType;

    /** The description of the event. */
    private final String description;

    /** The alarm type. */
    private final AlarmType alarmType;

    /**
     * Creates a new alarm.
     * @param severity The alarm severity
     * @param eventType The event triggering this alarm
     * @param description The description of the event
     */
    public Alarm(AlarmSeverity severity, EventType eventType, String description) {
        this(null, severity, eventType, description, AlarmType.RAISE);
    }

    /**
     * Creates an alarm with the given parameters.
     * @param id If non-null, the alarm ID; otherwise ID is auto-assigned based on the system time and event type
     * @param severity The alarm severity
     * @param eventType The event triggering this alarm
     * @param description The description of the event
     * @param alarmType The alarm type
     */
    public Alarm(String id, AlarmSeverity severity, EventType eventType, String description, AlarmType alarmType) {
        this.ts = System.currentTimeMillis() / 1000L;
        if (id != null) {
            this.id = id;
        } else {
            this.id = (eventType == EventType.HEARTBEAT)
                ? String.format("%s%s", ID_PREFIX, HEARTBEAT_ID)
                : String.format("%s%d-%d", ID_PREFIX, eventType.getId(), ts);
        }
        this.severity = severity;
        this.eventType = eventType;
        this.description = description;
        this.alarmType = alarmType;
    }

    /**
     * Returns a new alarm with this alarm's data, but with the given parameters and an updated timestamp.
     * Any 'null' argument will not be changed.
     * @param newSeverity The new alarm's severity
     * @param newDescription the new alarm's description
     * @param newAlarmType The new alarm's type
     * @return The new Alarm object
     */
    public Alarm copy(AlarmSeverity newSeverity, String newDescription, AlarmType newAlarmType) {
        return new Alarm(
            id,
            (newSeverity == null) ? severity : newSeverity,
            eventType,
            (newDescription == null) ? description : newDescription,
            (newAlarmType == null) ? alarmType : newAlarmType
        );
    }

    /**
     * Returns the number of seconds that have elapsed since this alarm was constructed.
     * @return The elapsed time in seconds
     */
    public long getElapsedSeconds() {
        return (System.currentTimeMillis() / 1000L) - ts;
    }

    @Override
    public String toString() {
        final char delimiter = ' ';
        StringBuilder sb = new StringBuilder();
        sb.append(id);
        sb.append(delimiter);
        sb.append(ts);
        sb.append(delimiter);
        sb.append(severity.toString());
        sb.append(delimiter);
        sb.append(eventType.toString().replace('_', '-'));
        if (eventType != EventType.HEARTBEAT) {
            sb.append('-');
            sb.append(alarmType.toString());
        }
        sb.append(delimiter);
        sb.append(description);
        return sb.toString();
    }
}
