#!/bin/bash
traceroute -6 $1 -F -N $2 -q $3 -p $4 --sport=$5 -l $6 -U -n | jq -sR '[sub("\n$";"") | splits("\n") | sub("^ +";"") | [splits(" +")]]'
