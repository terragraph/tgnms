#!/bin/bash
echo '['
LAST_REV="HEAD"
LAST_VERSION=""
VERSION="$LAST_VERSION"
while [ -n "$LAST_REV" ]
do
  VERSION="$LAST_VERSION"
  REV="$LAST_REV"
  # find next change that modified version
  while [ "$LAST_VERSION" == "$VERSION" ]
  do
    BLAME_REV=$(if [ "$REV" != "HEAD" ]; then echo ${REV}"^"; else echo $REV; fi)
    BLAME_LINE=$(git blame -l fbcnms-projects/tgnms/package.json "$BLAME_REV" 2>/dev/null| grep '"version"')
    REV=$(echo "$BLAME_LINE" | awk '{print $1}')
    VERSION=$(echo "$BLAME_LINE" | cut -d: -f4 | cut -d\" -f2)
  done
  REV_RANGE="$LAST_REV"
  if [ -n "$REV" ]; then
    REV_RANGE="${REV}..${LAST_REV}"
  fi
  # hard-code a version before we started versioning
  if [ -z "$VERSION" ]; then
    VERSION="1.0.0"
  fi
  # output as JSON
  echo -e "{\"version\": \"${VERSION}\",\"diffs\":"

  LOG_CSV=$(git log --pretty=format:'%H,%aN <%aE>,%ad,%s' "$REV_RANGE" fbcnms-projects/tgnms | sed 's/\\/\\\\/g' | sed 's/"/\\"/g')
  IFS=$'\n'
  (for line in $LOG_CSV
  do
    COMMIT=$(echo "$line" | cut -d, -f1)
    AUTHOR=$(echo "$line" | cut -d, -f2)
    DATE=$(echo "$line" | cut -d, -f3)
    TITLE=$(echo "$line" | cut -d, -f4)
    echo -n "{\"commit\": \"$COMMIT\", \"author\": \"$AUTHOR\", \"date\": \"$DATE\", \"title\": \"$TITLE\"},"
  done) | perl -pe 'BEGIN{print "["}; END{print "]\n"}' | perl -pe 's/},]/}]/'
  if [ -z "$REV" ]; then
    echo -e "}"
  else
    echo -e "},"
  fi
  # update last records
  LAST_REV=$REV
  LAST_VERSION="$VERSION"
done
echo ']'
