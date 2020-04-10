#
# - Try to find Facebook folly library
# This will define
# FOLLY_FOUND
# FOLLY_INCLUDE_DIR
# FOLLY_LIBRARIES
#

find_package(DoubleConversion REQUIRED)
find_library(LZMA lzma)
find_library(LZ4 lz4)
find_library(CRYPTO crypto)
find_library(BOOST_CONTEXT boost_context)
find_library(BOOST_REGEX boost_regex)
find_library(BOOST_PROGRAM_OPTIONS boost_program_options)
find_library(BOOST_SYSTEM boost_system)
find_library(BOOST_FILESYSTEM boost_filesystem)

find_library(
    ZSTD
    NAMES "zstd"
    HINTS "/usr/local/facebook/lib"
)

find_path(
    FOLLY_INCLUDE_DIR
    NAMES "folly/String.h"
    HINTS
        "/usr/local/facebook/include"
)

find_library(
    FOLLY_LIBRARY
    NAMES folly
    HINTS
        "/usr/local/facebook/lib"
)

set(FOLLY_LIBRARIES
   ${FOLLY_LIBRARY}
   ${DOUBLE_CONVERSION_LIBRARY}
   ${ZSTD}
   ${BOOST_CONTEXT}
   ${BOOST_REGEX}
   ${BOOST_PROGRAM_OPTIONS}
   ${BOOST_SYSTEM}
   ${BOOST_FILESYSTEM}
   ${LZMA}
   ${LZ4}
   ${CRYPTO}
   -levent
)

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(
    FOLLY DEFAULT_MSG FOLLY_INCLUDE_DIR FOLLY_LIBRARIES)

mark_as_advanced(FOLLY_INCLUDE_DIR FOLLY_LIBRARIES FOLLY_FOUND)

if(FOLLY_FOUND AND NOT FOLLY_FIND_QUIETLY)
    message(STATUS "FOLLY: ${FOLLY_INCLUDE_DIR}")
endif()
