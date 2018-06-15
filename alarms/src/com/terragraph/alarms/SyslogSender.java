/*
 * Copyright (c) 2018-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.alarms;

import java.io.IOException;

import com.cloudbees.syslog.Facility;
import com.cloudbees.syslog.MessageFormat;
import com.cloudbees.syslog.Severity;
import com.cloudbees.syslog.sender.AbstractSyslogMessageSender;
import com.cloudbees.syslog.sender.TcpSyslogMessageSender;
import com.cloudbees.syslog.sender.UdpSyslogMessageSender;

/**
 * Sender for syslog messages.
 */
public class SyslogSender {
	/** The transport protocol. */
	public enum TransportProtocol { TCP, UDP }

	/** The message sender. */
	private final AbstractSyslogMessageSender messageSender;

	/**
	 * Creates a syslog sender with default properties connecting to the given host.
	 * @param appName The default "appName" for messages
	 * @param facility The default "facility" for messages (as the facility code)
	 * @param severity The default "severity" for messages (as the severity level)
	 * @param host The syslog server hostname
	 * @param port The syslog server port
	 * @param protocol The transport protocol to use
	 */
	public SyslogSender(String appName, int facility, int severity, String host, int port, TransportProtocol protocol) {
		this(
			appName,
			Facility.fromNumericalCode(facility),
			Severity.fromNumericalCode(severity),
			MessageFormat.RFC_5424,
			host,
			port,
			protocol
		);
	}

	/**
	 * Creates a syslog sender connecting to the given host.
	 * @param appName The default "appName" for messages
	 * @param facility The default "facility" for messages
	 * @param severity The default "severity" for messages
	 * @param format The message format
	 * @param host The syslog server hostname
	 * @param port The syslog server port
	 * @param protocol The transport protocol to use
	 */
	public SyslogSender(
		String appName,
		Facility facility,
		Severity severity,
		MessageFormat format,
		String host,
		int port,
		TransportProtocol protocol
	) {
		// Instantiate the appropriate sender class
		// NOTE: AbstractSyslogMessageSender doesn't have setSyslogServerX() methods, so run those here
		if (protocol == TransportProtocol.TCP) {
			TcpSyslogMessageSender sender = new TcpSyslogMessageSender();
			sender.setSyslogServerHostname(host);
			sender.setSyslogServerPort(port);
			this.messageSender = sender;
		} else if (protocol == TransportProtocol.UDP) {
			UdpSyslogMessageSender sender = new UdpSyslogMessageSender();
			sender.setSyslogServerHostname(host);
			sender.setSyslogServerPort(port);
			this.messageSender = sender;
		} else {
			throw new IllegalArgumentException("Unknown transport protocol");
		}

		// Set default message properties
		messageSender.setDefaultAppName(appName);
		messageSender.setDefaultFacility(facility);
		messageSender.setDefaultSeverity(severity);

		// Set message format
		messageSender.setMessageFormat(format);
	}

	/**
	 * Sends a syslog message.
	 * @param message The message to send.
	 * @throws IOException
	 */
	public void sendMessage(String message) throws IOException {
		messageSender.sendMessage(message);
	}
}
