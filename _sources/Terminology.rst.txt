Terminology
===========

Definitions for terms used in TGNMS.

Definitions
-----------

TGNMS
"""""
Terragraph Network Management System. This refers to the entire suite of cloud services that runs the NMS web application.

Link
""""
The connection between two devices in a network.

Ignition
""""""""
The association of wireless links.


Network
"""""""
A collection of sites containing nodes connected via links arranged with a particular topology.

Minion
""""""
The E2E minion is a client process that connects to the E2E controller. The minion communicates with the firmware and driver and executes actions from the controller, such as sending down firmware configuration or bringing up wireless links to neighbors.

Stats Agent
"""""""""""
The stats agent is a process on each node that periodically submits stats and events to configured endpoints, such as a Kafka cluster or an NMS aggregator instance.

Topology
""""""""
The graph of network nodes and their connections.

Node
""""
A general purpose compute unit that controls one or more sectors and runs on Linux.

Sector
""""""
A wireless baseband card attached to a node.

Site
""""
A collection of one or more nodes installed at the same physical location.

Street Furniture
""""""""""""""""
Objects placed or fixed in the street for public use, such as light poles, utility poles, traffic signals, bus stops, billboards, and traffic signals.

DN (Distribution Node)
""""""""""""""""""""""
A node that distributes the bandwidth from a fiber PoP to neighboring nodes in the Terragraph mesh network. These are the active elements that make up the network itself.

CN (Client Node)
""""""""""""""""
A node serving as the termination point where service delivery takes place. These are not a part of the mesh network for distribution, but provide connectivity to a fixed client such as an eNodeB, Wi-Fi Access point (AP), or a fixed  connection to a home or office.

CPE (Customer Premise Equipment)
""""""""""""""""""""""""""""""""
Equipment connected to a Terragraph DN or CN for customer use, such as a Wi-Fi access point.

PoP (Point-of-Presence) Node
""""""""""""""""""""""""""""
A DN that serves as the demarcation between the Terragraph network and the provider’s backbone network. The PoP node is part of the Terragraph network.

E2E (End-to-End) Controller
"""""""""""""""""""""""""""
The cloud service that configures and controls various aspects of the Terragraph network.

NMS (Network Management Service) Aggregator
"""""""""""""""""""""""""""""""""""""""""""
The cloud service that collects and aggregates statistics, events, and logs from nodes in the Terragraph network.

Mesh Network
""""""""""""
Terragraph employs a directed mesh network of DNs to deliver broadband services. A directed mesh network is designed to use multiple connections in several directions from each node thereby providing both high reliability and path redundancy.

Open/R
""""""
The routing protocol developed for and used by Terragraph.

802.11ad
"""""""""""
The IEEE standard which supports high speed wireless communication in the 60GHz unlicensed band. Terragraph is based on the IEEE 802.11ad specification, but portions of the standard have been modified to improve reliability and performance  over longer link distances.

802.11ay
""""""""
An extension to the IEEE 802.11ad standard, intended to focus specifically on the Terragraph use case (i.e. outdoor, scheduled, and directed) that enables up to 40Gbps through channel bonding and MIMO.

Path Loss
"""""""""""
The reduction in power density (attenuation) of an electromagnetic wave as it propagates through the wireless channel. It is a combination of “free space” loss and channel impairments such as diffraction and reflection. As distance  increases or an obtrusion enters into the link, path loss increases. This quantity is expressed in decibels and generally exceeds 100dB between the transmitter and receiver at the edge of coverage.

Azimuth
"""""""
The orientation at which a radio antenna is pointed. This is based on a compass angle between 0-360 degrees.

dBm
"""
The power ratio in decibels (dB) of the measured power referenced to one milliwatt (mW).

RSSI (Received Signal Strength Indicator)
"""""""""""""""""""""""""""""""""""""""""
The power present in a received radio signal. The smaller the value, the lower the signal power received by the radio.

PER (Packet Error Rate)
"""""""""""""""""""""""
A ratio measuring received packets that contain at least one error.

SNR (Signal-to-Noise Ratio)
"""""""""""""""""""""""""""
The ratio of intended receive signal to the total noise and interference. The limit of connectivity is determined by the SNR that is achieved at the receiver, which drives connectivity and the speed of the connection.

MCS (Modulation and Coding Scheme)
""""""""""""""""""""""""""""""""""
Based on a link’s SNR and PER, link adaptation on the Terragraph radio will pick a corresponding MCS to ensure that the link remains stable in changing RF conditions. MCS refers to the notion of packaging less data in fewer number of bits and mathematically protecting it to increase the probability of successful decoding on the receiver end. Low MCS is directly proportional to lower throughput. A table showing the different MCS rates and corresponding data rates is shown below.
