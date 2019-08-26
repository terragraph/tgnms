#!/usr/bin/env python3

import sys

from modules.util_logger import EmptyLogger


try:
    import pexpect
except BaseException:
    print("Require pexpect to continue")
    raise


class SCP(object):
    """
    SCP class
    Currently this only supports single-hop (remote, local) pair
    """

    def __init__(
        self,
        remoteIP,
        username=None,
        password=None,
        authkey=None,
        child=None,
        logger=None,
        devserver_hack=False,
    ):
        """
        @param remoteIP: ip address of remote
        @param username: username for remote ip
        @param password: password for remote ip
        @param authkey: by default is None (not using key)
        @param logger: by default None, meaning do not write log to file
        """
        self.remoteIP = remoteIP
        self.username = username
        self.password = password
        # check logger param
        if logger is None:
            # create a scp log (print to stdout only) if not set
            self.logger = EmptyLogger("SCP", logPath=None, printout=True)
        else:
            self.logger = logger
        # get the child from spawned window or None
        self.child = child
        # determine scp with key or password
        self.cmd = "scp "
        if devserver_hack:
            self.cmd += (
                "-o ProxyCommand="
                + '"nc --proxy-type http --proxy fwdproxy:8080 %h %p" '
            )
        if authkey is not None:
            self.cmd += "-i {0} ".format(authkey)
        else:
            self.cmd += "-o PubkeyAuthentication=no "

    def _startit(self, cmd, timeout=9999.99):
        """
        send command via scp
        (either from remote to local or from local to remote)
        @param cmd: the scp command
        """
        self.logger.debug("SCP cmd: {0} with timeout {1}s".format(cmd, timeout))
        # by default spawn a new socket
        new_spawn = False
        # by default socket closed after scp
        flag_success = pexpect.EOF
        try:
            self.logger.debug("Starting SCP, self.child = {}".format(self.child))
            if self.child is None:
                # pexpect wants to log bytes
                # sys.stdout defaults to expecting strings
                # sys.stdout.buffer is happy with bytes
                self.logger.debug("Sending {}".format(cmd))
                self.child = pexpect.spawn(
                    cmd,
                    env={"TERM": "dumb"},
                    logfile=getattr(sys.stdout, "buffer", sys.stdout),
                )
                self.logger.debug("spawn is successful in SCP.")
                new_spawn = True
            else:
                self.child.sendline(cmd)
                flag_success = "[#\$] "
            self.logger.debug("SCP started")
            i = self.child.expect(
                ["password:", "yes", "failed", "denied", flag_success], timeout=timeout
            )
            # tmp variable
            j, k = -1, -1
            if i is 1:
                # ask for known_host
                self.child.sendline("yes")
                j = self.child.expect(
                    ["password:", "failed", "denied", flag_success], timeout=timeout
                )
            if i is 0 or j is 0:
                # ask for password
                self.child.sendline("{0}\n".format(self.password))
                k = self.child.expect(flag_success, timeout=timeout)
            # SCP finished
            if i is 4 or j is 3 or k is 0:
                self.logger.debug(self.child.before)
                if new_spawn:
                    self.child.close()
                    self.child = None
                return True
            # otherwise either failed in known_host or incorrect password
            # or incorrect key
            if i is 2 or j is 1:
                self.logger.error("Known_host verification failed!")
            if i is 3 or j is 2:
                self.logger.error("Permission denied!")
        except KeyboardInterrupt:
            self.logger.debug("keyboard interrupted")
            self.logger.debug(self.child.before)
            self.logger.debug(self.child.after)
            raise
        except BaseException as ex:
            self.logger.error("Error sending command..")
            self.logger.debug(ex)
            self.logger.debug(self.child.before)
            self.logger.debug(self.child.after)
            raise
        self.logger.error("Err: {0}".format(self.child.before))
        if new_spawn:
            self.child.close()
            self.child = None
        return False

    def pull(self, remotePath, localPath="./"):
        """
        Pull file from the remote.
        @param remotePath: the remote file path
        @param localPath: optional, by default './' + file name
        @return True/False: success/failed
        """
        if ":" in self.remoteIP:
            # ipv6
            cmd = "{0} {1}@[{2}]:{3} {4}".format(
                self.cmd, self.username, self.remoteIP, remotePath, localPath
            )
        else:
            # ipv4
            cmd = "{0} {1}@{2}:{3} {4}".format(
                self.cmd, self.username, self.remoteIP, remotePath, localPath
            )
        return self._startit(cmd)

    def push(self, localPath, remotePath="/home/root/"):
        """
        Push file to the remote.
        @param localPath: the local path of file to push
        @param remotePath: option, by default '/home/root/' + file name
        @return True/False: success/failed
        """
        if ":" in self.remoteIP:
            # ipv6
            cmd = "{0} {1} {2}@[{3}]:{4}".format(
                self.cmd, localPath, self.username, self.remoteIP, remotePath
            )
        else:
            # ipv4
            cmd = "{0} {1} {2}@{3}:{4}".format(
                self.cmd, localPath, self.username, self.remoteIP, remotePath
            )
        return self._startit(cmd)
