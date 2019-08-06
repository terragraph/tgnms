#
# - Try to find rdkafka library
# This will define
# RDKAFKA_FOUND
# RDKAFKA_INCLUDE_DIR
# RDKAFKA_LIBRARIES
#

find_path(
    RDKAFKA_INCLUDE_DIR
    NAMES "librdkafka/rdkafka.h"
    HINTS
        "/usr/local/facebook/include"
)

find_library(
    RDKAFKA_LIBRARY
    NAMES rdkafka
    HINTS
        "/usr/local/facebook/lib"
)

set(RDKAFKA_LIBRARIES ${RDKAFKA_LIBRARY})

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(
    RDKAFKA DEFAULT_MSG RDKAFKA_INCLUDE_DIR RDKAFKA_LIBRARIES)

mark_as_advanced(RDKAFKA_INCLUDE_DIR RDKAFKA_LIBRARIES RDKAFKA_FOUND)

if(RDKAFKA_FOUND AND NOT RDKAFKA_FIND_QUIETLY)
    message(STATUS "RDKAFKA: ${RDKAFKA_INCLUDE_DIR}")
endif()
