{
  "targets": [
    {
      "target_name": "test",
      "sources": [
        "test.cc",
      ],
      "cflags": [
        "-fexceptions",
      ],
      "libraries": [
        "-lfolly",
        "-lthrift",
	"-lthriftcpp2",
	"-lthriftprotocol",
	"/home/paul/nms/thrift/gen-cpp2/libthriftctrl.so",
      ],
      "include_dirs": [
        "/usr/local/lib",
        "/usr/lib",
        "/home/paul/nms/thrift/gen-cpp2",
      ],
      "cflags_cc!": [
        "-fno-rtti",
      ],
      "cflags_cc": [
        "-fexceptions",
        "-fno-rtti",
      ],
    }
  ]
}
