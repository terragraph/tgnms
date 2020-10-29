#
# - Try to find Pistache library
# This will define
# PISTACHE_FOUND
# PISTACHE_INCLUDE_DIR
# PISTACHE_LIBRARY
#

find_path(
  PISTACHE_INCLUDE_DIR
  NAMES "pistache/router.h"
  HINTS
    "/usr/local/include"
)

find_library(
  PISTACHE_LIBRARY
  NAMES pistache
  HINTS
    "/usr/local/lib64"
  )

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(
  PISTACHE DEFAULT_MSG PISTACHE_INCLUDE_DIR PISTACHE_LIBRARY)

mark_as_advanced(PISTACHE_INCLUDE_DIR PISTACHE_LIBRARY PISTACHE_FOUND)

if(PISTACHE_FOUND AND NOT PISTACHE_FIND_QUIETLY)
  message(STATUS "PISTACHE: ${PISTACHE_INCLUDE_DIR}")
endif()
