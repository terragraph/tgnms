#
# - Try to find Facebook fbthrift library
# This will define
# FBTHRIFT_FOUND
# FBTHRIFT_INCLUDE_DIR
# FBTHRIFT_LIBRARIES
#

find_package(OpenSSL REQUIRED)

find_path(
    FBTHRIFT_INCLUDE_DIR
    NAMES "thrift/lib/cpp2/Thrift.h"
    HINTS
        "/usr/local/facebook/include"
)

find_library(FMT fmt)

find_library(
    FBTHRIFT_CORE_LIBRARY
    NAMES thrift-core
    HINTS
        "/usr/local/facebook/lib"
)

find_library(
    FBTHRIFT_CPP2_LIBRARY
    NAMES thriftcpp2
    HINTS
        "/usr/local/facebook/lib"
)

find_library(
    FBTHRIFT_PROTOCOL_LIBRARY
    NAMES thriftprotocol
    HINTS
        "/usr/local/facebook/lib"
)

find_library(
    PROTOCOL_LIBRARY
    NAMES protocol
    HINTS
        "/usr/local/facebook/lib"
)

find_library(
    TRANSPORT_LIBRARY
    NAMES transport
    HINTS
        "/usr/local/facebook/lib"
)

find_library(
    FBTHRIFT_METADATA_LIBRARY
    NAMES thriftmetadata
    HINTS
        "/usr/local/facebook/lib"
)

find_library(
    FBTHRIFT_FROZEN2_LIBRARY
    NAMES thriftfrozen2
    HINTS
        "/usr/local/facebook/lib"
)

set(FBTHRIFT_LIBRARIES
    ${FBTHRIFT_CORE_LIBRARY}
    ${FBTHRIFT_PROTOCOL_LIBRARY}
    ${FBTHRIFT_CPP2_LIBRARY}
    ${FBTHRIFT_PROTOCOL_LIBRARY}
    ${FBTHRIFT_METADATA_LIBRARY}
    ${FBTHRIFT_FROZEN2_LIBRARY}
    ${PROTOCOL_LIBRARY}
    ${TRANSPORT_LIBRARY}
    ${OPENSSL_LIBRARIES}
    ${FOLLY_LIBRARIES}
    ${FMT}
    -lpthread
)

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(
    FBTHRIFT DEFAULT_MSG FBTHRIFT_INCLUDE_DIR FBTHRIFT_LIBRARIES)

mark_as_advanced(FBTHRIFT_INCLUDE_DIR FBTHRIFT_LIBRARIES FBTHRIFT_FOUND)

if(FBTHRIFT_FOUND AND NOT FBTHRIFT_FIND_QUIETLY)
    message(STATUS "FBTHRIFT: ${FBTHRIFT_INCLUDE_DIR}")
endif()
