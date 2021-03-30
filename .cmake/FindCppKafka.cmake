#
# - Try to find cppkafka library
# This will define
# CPPKAFKA_FOUND
# CPPKAFKA_INCLUDE_DIR
# CPPKAFKA_LIBRARIES
#

find_path(
    CPPKAFKA_INCLUDE_DIR
    NAMES "cppkafka/cppkafka.h"
    HINTS
        "/usr/local/facebook/include"
)

find_library(
    CPPKAFKA_LIBRARY
    NAMES cppkafka
    HINTS
        "/usr/local/facebook/lib"
)

set(CPPKAFKA_LIBRARIES ${CPPKAFKA_LIBRARY})

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(
    CPPKAFKA DEFAULT_MSG CPPKAFKA_INCLUDE_DIR CPPKAFKA_LIBRARIES)

mark_as_advanced(CPPKAFKA_INCLUDE_DIR CPPKAFKA_LIBRARIES CPPKAFKA_FOUND)

if(CPPKAFKA_FOUND AND NOT CPPKAFKA_FIND_QUIETLY)
    message(STATUS "CPPKAFKA: ${CPPKAFKA_INCLUDE_DIR}")
endif()
