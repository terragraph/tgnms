FILEPATH=$1
PORTS=$(awk '!/^#/ {print $2}' "$FILEPATH")
echo "Setting TOS headers"
for p in $PORTS
do
    echo "Setting TOS for port $p"
    iptables -A OUTPUT -t mangle -p tcp --sport $p -j TOS --set-tos 0x88
    ip6tables -A OUTPUT -t mangle -p tcp --sport $p -j TOS --set-tos 0x88
done

iptables -t mangle -L OUTPUT
ip6tables -t mangle -L OUTPUT
