#!/usr/bin/env python3

import os
import time

from modules.util_logger import EmptyLogger
from modules.util_scp import SCP


import pexpect  # isort:skip


class SSH(object):
    """
    SSH provides basic commands to connect to a remote host
    It also gives ability to write a command and obtain feedback (self.write)
    And it provides basic functions including:
    * single-hop scp (self.pull and self.push)
    * file existence check (self.isfile)
    * folder existence check (self.isfolder)
    """

    def __init__(self, logPath=None):
        """
        @param logPathDir: by default None, meaning do not write log to file
        """
        self.logger = EmptyLogger("SSH", logPath=logPath, printout=True)
        # for remote login
        self.child = None
        # track current connection
        # in case of multi-hop connections (self.connect())
        self.isConnected = []

    def write(
        self, cmd, expectResp="[#$] ", timeout=100, checkCMD=True, noExpect=False
    ):
        """
        Send command through SSH
        @param cmd: command string to send
        @param expectResp:
          expected keywords captured by pexpect, by default '[#$] '
        @param timeout:
          how long we wait for the expected response keyword, by default 20sec
        @param checkCMD: whether to check if a command is sent
          by default True. Otherwise ignoring command validity check
          (for password mostly)
        @param noExpect:
          by default False. Otherwise ignoring timeout due to not finding
          the expected keyword
        @return command response in a list if there is any
          if error, return ['err', reason_of_error]
          other wise, return ['', response_line1, resonse_line2, ...]
        """
        # limit debug msg to 100 chars; otherwise too many
        self.logger.debug(
            "in write, cmd sending: {0}, noExpect={1}, timeout={2}".format(
                cmd[:100], noExpect, timeout
            )
        )
        try:
            # send command to child process
            self.child.sendline(cmd)
            # wait for the prompt if we expect something
            if not noExpect:
                i = self.child.expect([expectResp, "yes", pexpect.EOF], timeout=timeout)
                if i == 1:
                    self.child.sendline("yes")
                    i = self.child.expect([expectResp, pexpect.EOF], timeout=timeout)
                if i == 0:
                    tmp = self.child.before.decode()
                    response = "\r\n" + tmp.rstrip()
                    # limit response debug msg to 100 chars; otherwise too many
                    self.logger.debug(response[:100])
                    # only return the meaningful results
                    if "echo" in response or "cat" in response:
                        self.logger.debug("echo in response or cat in response")
                        response_split = response.split("\r\n")
                        for resp_index in range(len(response_split)):
                            if response_split[resp_index] == cmd:
                                del response_split[resp_index]
                                break
                        return response_split
                    else:
                        # remove the last dummy result in response
                        response_split = response.split("\r\n")[:-1]
                        for resp_index in range(len(response_split)):
                            if response_split[resp_index] == cmd:
                                del response_split[resp_index]
                                break
                        return response_split
                else:
                    self.logger.debug("i = {0}".format(i))
                    self.logger.debug(self.child.before)
                    self.logger.debug(self.child.after)
                return ["err", ""]
        except KeyboardInterrupt:
            self.logger.debug("keyboard interrupted")
            self.logger.debug(self.child.before)
            self.logger.debug(self.child.after)
            raise
        except pexpect.TIMEOUT:
            self.logger.error("Timeout happens!")
            self.logger.error(self.child.before)
            # send ctrl + c to prevent loop issue
            self.child.send("\003")
            try:
                i = self.child.expect([expectResp, pexpect.EOF], timeout=timeout)
            except pexpect.TIMEOUT:
                pass
            self.logger.error(self.child.before)
            return ["err", ""]
        except BaseException as ex:
            self.logger.error("Error sending command..")
            self.logger.error("Got resp: {0}".format(self.child.before))
            self.logger.debug(ex)
        return ["err", self.child.before]

    def connect(
        self,
        targetIP,
        username=None,
        password=None,
        authkey=None,
        devserver_hack=False,
        noExpect=False,
        timeout=100,
    ):
        """
        SSH connection to the device
        @param targetIP: remote ip address of a marvel device
        @param username: username for remote ip
        @param password: password for remote ip
        @param authkey: key path, by default is None (do not use key)
        @param devserver_hack: default False, if set True will set proxy
        @return True/False indicating function success
        """
        if username is None or (password is None and authkey is None):
            self.logger.error("Please specifiy login information")
            return False
        self.logger.debug(
            "usr: {}, pwd: {}, key: {}".format(username, password, authkey)
        )
        # determine ssh command with key or password
        cmd = "ssh "
        if authkey is not None:
            cmd += "-i {0} ".format(authkey)
        if devserver_hack:
            cmd += (
                "-o ProxyCommand="
                + '"nc --proxy-type http --proxy fwdproxy:8080 %h %p" '
            )
        cmd += "{0}@{1}".format(username, targetIP)
        self.logger.debug("cmd: {0}".format(cmd))
        self.logger.debug("isConnected = {0}".format(self.isConnected))
        # login
        stuff_to_expect = [
            "[#$] ",
            "password:",
            "Are you sure you want to continue connecting",
            "(yes/no)",
            "failed",
            "denied",
            "unreachable",
            "No route to host",
            pexpect.EOF,
        ]
        try:
            if len(self.isConnected) is 0:
                try:
                    if pexpect.__version__ >= 4.5:
                        self.child = pexpect.spawn(
                            cmd,
                            env={"TERM": "dumb"},
                            echo=False,
                            timeout=timeout,
                            use_poll=True,
                        )
                    else:
                        self.logger.note(
                            "old pexpect version supports at max "
                            + "1024 filedescriptors, please limit pnum "
                            + "to less than 400"
                        )
                        self.child = pexpect.spawn(
                            cmd, env={"TERM": "dumb"}, echo=False, timeout=timeout
                        )
                except TypeError:
                    try:
                        self.child = pexpect.spawn(cmd, env={"TERM": "dumb"})
                        self.child.setecho(False)
                    except BaseException as ex:
                        self.logger.error(ex)
                        return False
                self.delaybeforesend = None
            else:
                self.child.sendline(cmd)
                # self.write(cmd='{0}\n'.format(cmd), noExpect=noExpect)
                time.sleep(3)
            i = self.child.expect(stuff_to_expect, timeout=timeout)
            self.logger.debug(
                "at i ({0}), connecting {1}, before: {2}".format(
                    i, targetIP, self.child.before
                )
            )
            self.logger.debug(
                "at i ({0}), connecting {1}, after: {2}".format(
                    i, targetIP, self.child.after
                )
            )
            if (i is 2) or (i is 3):
                # add to hosts
                self.child.sendline("yes")
                i = self.child.expect(stuff_to_expect, timeout=timeout)
                self.logger.debug(
                    "at follow-up i ({0}), connecting {1}, before: {2}".format(
                        i, targetIP, self.child.before
                    )
                )
                self.logger.debug(
                    "at follow-up i ({0}), connecting {1}, after: {2}".format(
                        i, targetIP, self.child.after
                    )
                )
            if i is 1:
                # logged in with password (must append newline)
                self.logger.debug(
                    "cmd password={0}, noExpect={1}".format(password, noExpect)
                )
                self.write(
                    cmd="{0}\n".format(password), timeout=timeout, noExpect=noExpect
                )
                # print('after write, output={}'.format(self.child.read()))
                i = self.child.expect(stuff_to_expect, timeout=timeout)
                self.logger.debug(
                    "at follow-up i ({0}), connecting {1}, before: {2}".format(
                        i, targetIP, self.child.before
                    )
                )
                self.logger.debug(
                    "at follow-up i ({0}), connecting {1}, after: {2}".format(
                        i, targetIP, self.child.after
                    )
                )
            # already logged in at first place
            # or, using correct key
            # or, enter correct password
            if i is 0:
                self.isConnected.append(targetIP)
                self.logger.debug(
                    "Connected to {0}, isConnected = {1}".format(
                        targetIP, self.isConnected
                    )
                )
                return True
        except pexpect.TIMEOUT:
            self.logger.error("Timeout happened in connect()!")
            self.logger.error("Err: before {0}".format(self.child.before))
            self.logger.error("Err: after {0}".format(self.child.after))
            # send ctrl + c to prevent loop issue
            self.child.send("\003")
            try:
                self.child.expect(["[#$] ", pexpect.EOF], timeout=timeout)
            except BaseException:
                pass
        self.logger.error("Err: before {0}".format(self.child.before))
        self.logger.error("Err: after {0}".format(self.child.after))
        self.logger.error("Login failed")
        return False

    def isfolder(self, folderpath):
        """
        Check if remote folder exists
        @param filepath: the file path in the remote device
        @return True/False
        """
        resp = self.write(
            'if [[ -d "{0}" ]];'.format(folderpath)
            + "then echo OK; else echo FAILED; fi"
        )
        return (not resp[0] == "err") and (resp[1] == "OK")

    def isfile(self, filepath):
        """
        Check if remote file exists
        @param filepath: the file path in the remote device
        @return True/False
        """
        resp = self.write(
            'if [[ -f "{0}" ]];'.format(filepath) + "then echo OK; else echo FAILED; fi"
        )
        self.logger.debug("resp={}".format(resp))
        self.logger.debug(
            "isfile={}".format((not resp[0] == "err") and resp[1] == "OK")
        )
        return (not resp[0] == "err") and resp[1] == "OK"

    def close(self, force=True):
        """
        Close current ssh connection
        """
        self.logger.debug("Closing connection to {0}".format(self.isConnected[-1]))
        if len(self.isConnected) > 1:
            resp = self.write("exit")
            if resp[0] == "err":
                return False
        elif self.child is not None:
            resp = self.write("exit", expectResp=pexpect.EOF)
            if resp[0] == "err":
                self.child.close(force=force)
            self.child = None
            self.logger.debug("SSH connection completely closed")
        self.isConnected.pop()
        return True

    def close_all(self, force=True):
        """
        Close all ssh connection
        """
        length = len(self.isConnected)
        for _i in range(length):
            self.close(force=force)
        return True

    def pull(
        self,
        targetIP,
        remotePath,
        localPath,
        username=None,
        password=None,
        authkey=None,
        devserver_hack=False,
        forceit=False,
    ):
        """
        pull file from remote path to local path
        @param targetIP: remote ip;
                         set None or 'bash' to do local to local move
        @param remotePath: remote file path
        @param localPath: local file path
        @param forceit: if set True, will push even if file already exists
        @return True/False
        """
        if targetIP is None or targetIP == "bash":
            resp = self.write("mv {0} {1}".format(remotePath, localPath))
            if resp[0] == "err":
                return False
            return True
        if username is None or (password is None and authkey is None):
            self.logger.error("Please specifiy login information")
            return False
        mySCP = SCP(
            targetIP,
            username=username,
            password=password,
            authkey=authkey,
            logger=self.logger,
            devserver_hack=devserver_hack,
        )
        # pull the file
        if forceit or not os.path.isfile(localPath):
            self.logger.info(
                "Pulling from {0} to local {1}".format(remotePath, localPath)
            )
            if not mySCP.pull(remotePath, localPath=localPath):
                self.logger.error("{0} pulling failed..".format(remotePath))
                return False
        else:
            self.logger.info(
                "Local file {0} exists, will not overwrite".format(localPath)
            )
        return True

    def push(
        self,
        targetIP,
        localPath,
        remotePath,
        username=None,
        password=None,
        authkey=None,
        devserver_hack=False,
        forceit=False,
        to_remote_bridge=False,
    ):
        """
        push file from local path to remote path
        @param targetIP: remote ip;
                         set None or 'bash' to do local to local move
        @param localPath: local file path
        @param remotePath: remote file path
        @param forceit: if set True, will push even if file already exists
        @param to_remote_bridge:
            if True, then local device -> remote machine via scp
            if False, then remote login device -> another remote device
        @return True/False
        """
        if targetIP is None or targetIP == "bash":
            resp = self.write("mv {0} {1}".format(localPath, remotePath))
            if resp[0] == "err":
                return False
            return True
        if to_remote_bridge:
            child = self.child
        else:
            child = None
        if username is None or (password is None and authkey is None):
            self.logger.error("Please specifiy login information")
            return False
        mySCP = SCP(
            targetIP,
            username=username,
            password=password,
            authkey=authkey,
            child=child,
            logger=self.logger,
            devserver_hack=devserver_hack,
        )
        # check if local file exist, or remote file already exists
        if to_remote_bridge:
            if not self.isfile(localPath):
                self.logger.error("File {0} does not exist here".format(localPath))
                return False
        else:
            if not os.path.isfile(localPath):
                self.logger.error("Local file {0} does not exist".format(localPath))
                return False
            if not forceit and self.isfile(remotePath):
                self.logger.info(
                    "Remote {0} exists, no need to upload".format(remotePath)
                )
                return True
        self.logger.info("Pushing {0} to remote {1}..".format(localPath, remotePath))
        return mySCP.push(localPath, remotePath=remotePath)
