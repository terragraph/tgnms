#!/usr/bin/env python3

# built-ins
import logging


# modules
try:
    from modules.addon_terminal_color import colorString
except BaseException:
    print("addon_terminal_color exception! will continue w/o colors")

    def colorString(stuff):
        return stuff


class EmptyLogger:
    """
    logger base
    """

    def __init__(
        self, loggerTag, printout=False, logPath=None, printlevel=logging.DEBUG
    ):
        self.myLogger = logging.getLogger(loggerTag)
        self.myLogger.setLevel(logging.DEBUG)
        self.ch_file = None
        self.ch_stream = None
        formatter = logging.Formatter("%(asctime)s %(name)s %(levelname)s, %(message)s")
        if logPath is not None:
            self.ch_file = logging.FileHandler(logPath, "a")
            self.ch_file.setLevel(logging.DEBUG)
            self.ch_file.setFormatter(formatter)
            self.myLogger.addHandler(self.ch_file)
        if printout:
            self.ch_stream = logging.StreamHandler()
            self.ch_stream.setLevel(printlevel)
            self.ch_stream.setFormatter(formatter)
            self.myLogger.addHandler(self.ch_stream)
        self.myLogger.debug("Logging started.")

    def critical(self, string, *args, **kwargs):
        self.myLogger.error(colorString(string))

    def info(self, string, *args, **kwargs):
        self.myLogger.info(string)

    def debug(self, string, *args, **kwargs):
        self.myLogger.debug(string)

    def error(self, string, *args, **kwargs):
        self.myLogger.error(colorString(string))

    def note(self, string, *args, **kwargs):
        self.myLogger.info(colorString(string, color="blue"))

    def disable(self):
        """
        turn off logging
        """
        self.off()

    def enable(self):
        """
        turn on logging
        """
        self.on()

    def on(self):
        """
        turn on logging
        """
        if self.ch_file is not None:
            self.myLogger.addHandler(self.ch_file)
        if self.ch_stream is not None:
            self.myLogger.addHandler(self.ch_stream)

    def off(self):
        """
        turn off logging
        """
        if self.ch_file is not None:
            self.ch_file.close()
            self.myLogger.removeHandler(self.ch_file)
        if self.ch_stream is not None:
            self.myLogger.removeHandler(self.ch_stream)


def testing():
    """
    Utility Testing Function - not supposed to use this!

    The following test demonstrates how to use logger w/ colors
    """
    myObj = EmptyLogger("TEST", printout=True)
    myObj.note("Success!")
    myObj.info("Some info..")
    myObj.error("Error looks like this!")
    myObj.disable()
    myObj = None


if __name__ == "__main__":
    print("==== Testing... ====")
    testing()
