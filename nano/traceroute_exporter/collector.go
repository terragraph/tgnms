package main

import (
	"fmt"
	"github.com/go-cmd/cmd"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	//TODO: Investigate if Prometheus LOG is the best option for this case.
	"github.com/prometheus/common/log"
)

const (
	targetNotFoundErrorMsg = "There's no target IP address sent from Prometheus."
	traceRouteCmd          = "traceroute"
	ipv6Param              = "-6"
	probeFragmentParam     = "-F"
	squeriesParam          = "-N"
	queriesNumParam        = "-q"
	portParam              = "-p"
	sourcePortParam        = "--sport=%s"
	flowLabelParam         = "-l"
	udpParam               = "-U"
	doNotMapIpParam        = "-n"
)

type traceRouteDetails struct {
	target       string //The target IP address coming from Prometheus
	squeries     string //Number of probe packets sent out simultaneously
	queriesQuant string //Number of probe packets per hop
	port         string //The destination port base traceroute will use
	sourcePort   string //The source port base traceroute will use
	flowParam    string //Use specified flow_label for IPv6 packets
}

//TraceOutput - The traceroute output results from Traceroute CMD
type TraceOutput map[string][]float64

var (
	currentDir, _   = filepath.Abs(filepath.Dir(os.Args[0]))
	traceBashStr    = fmt.Sprintf("%s/%s", currentDir, "trace.sh")
	traceRouteStats = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "traceroute_avg",
			Help: "Traceroute information.",
		},
		[]string{"node", "nodename"},
	)
)

func execCmd(target string) (TraceOutput, error) {
	var err error
	traceOut := make(TraceOutput)
	//TODO: Query those static values from DB
	details := &traceRouteDetails{
		target:       target,
		squeries:     "20",
		queriesQuant: "5",
		port:         "41041",
		sourcePort:   "24599",
		flowParam:    "253",
	}

	cmd := details.buildTraceCmd()
	status := <-cmd.Start()
	defer cmd.Done()

	for i, line := range status.Stdout {
		values := make([]float64, 0)
		if i != 0 {
			out := strings.Split(line, " ms")
			node, value := extractNodeIP(out)
			if details.target != node {
				values = append(values, value)
				seriesQnt, _ := strconv.Atoi(details.queriesQuant)
				for j := 1; j < seriesQnt; j++ {
					if j < len(out) {
						floatValue, _ := strconv.ParseFloat(strings.TrimSpace(out[j]), 64)
						values = append(values, floatValue)
					}
				}
				traceOut[node] = values
			}
		}
	}
	return traceOut, err
}

func extractNodeIP(node []string) (string, float64) {
	nodeIP, nextIndex := iterate(4, node)
	firstValue, _ := iterate(nextIndex, node)
	floatValue, _ := strconv.ParseFloat(firstValue, 64)
	return nodeIP, floatValue
}

func iterate(init int, node []string) (string, int) {
	str := make([]byte, 0)
	var lastIndex int
	for i := init; i < len(node[0]); i++ {
		if string(node[0][i]) != " " {
			str = append(str, node[0][i])
		} else {
			lastIndex = i + 2
			break
		}
	}
	return string(str), lastIndex
}

func (build *traceRouteDetails) buildTraceCmd() *cmd.Cmd {
	sourcePortStr := fmt.Sprintf(sourcePortParam, build.sourcePort)
	cmd := cmd.NewCmd(
		traceRouteCmd, ipv6Param,
		build.target, probeFragmentParam,
		squeriesParam, build.squeries,
		queriesNumParam, build.queriesQuant,
		portParam, build.port,
		sourcePortStr, flowLabelParam,
		build.flowParam, udpParam, doNotMapIpParam)
	return cmd
}

func tracerouteProbeHandler(writer http.ResponseWriter, req *http.Request) {
	params := req.URL.Query()
	if params["target"] != nil {
		target := params["target"][0]

		traceRouteCMDReult, err := execCmd(target)
		if err == nil && traceRouteCMDReult != nil {
			// traceRouteResultMap := traceRouteCMDReult.parseToMap(target)
			//Does not block the main function
			go exportValues(traceRouteCMDReult)

			registry := prometheus.NewRegistry()
			registry.Register(traceRouteStats)

			promHandler := promhttp.HandlerFor(registry, promhttp.HandlerOpts{})
			promHandler.ServeHTTP(writer, req)
		} else {
			log.Error(err)
		}
	} else {
		log.Error(targetNotFoundErrorMsg)
	}
}

func exportValues(valuesPerNode map[string][]float64) {
	for node, values := range valuesPerNode {
		avg := calcAverage(values)
		//TODO: Query mongodb to retieve node name by IPAddress
		traceRouteStats.WithLabelValues(node, "node_name").Set(avg)
	}
}

//Calculate average based in an array of latency as per results from Traceroute.
func calcAverage(values []float64) float64 {
	var sum float64
	for _, value := range values {
		sum = sum + value
	}
	return sum / float64(len(values))
}

func main() {
	http.Handle("/metrics", promhttp.Handler())
	http.HandleFunc("/trace", tracerouteProbeHandler)
	//TODO: Define a better dynamic way to infer server ports.
	log.Fatal(http.ListenAndServe(":9116", nil))
}
