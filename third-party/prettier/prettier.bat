@REM (c) Facebook, Inc. and its affiliates. Confidential and proprietary.

@SET NODE=%~dp0\..\..\..\xplat\third-party\node\bin\node.bat
@SET PRETTIER=%~dp0\node_modules\prettier\bin-prettier.js

@CALL "%NODE%" "%PRETTIER%" %*
