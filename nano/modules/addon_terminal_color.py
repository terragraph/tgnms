#!/usr/bin/env python3

"""
Func for Terminal Coloring
"""


class TerminalColors:
    """
    Currently support purple, cyan, darkcyan, blue, green, yellow, red
    """

    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"
    END = "\033[0m"
    PURPLE = "\033[95m"
    CYAN = "\033[96m"
    DARKCYAN = "\033[36m"
    BLUE = "\033[94m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BLACK = ""


def colorString(myString, bold=True, underline=False, color="red"):
    """
    Set color of the string, including bold and underline
    @ param myString: the string
    @ param bold: flag to set if we want to bold the text
    @ param underline: flag to set if we want to draw underline
    @ param color: specify a color name, e.g. 'red' or 'green'
      (may not show depending on terminal setups)
    @ return new string wrapped with terminal color indicators
    """
    tmp = myString
    if bold:
        tmp = "{1}{0}{2}".format(tmp, TerminalColors.BOLD, TerminalColors.END)
    if underline:
        tmp = "{1}{0}{2}".format(tmp, TerminalColors.UNDERLINE, TerminalColors.END)
    if hasattr(TerminalColors, color.upper()):
        tmp = "{1}{0}{2}".format(
            tmp, getattr(TerminalColors, color.upper()), TerminalColors.END
        )
    return tmp


if __name__ == "__main__":
    print("==== Testing... ====")
    print(colorString("Underline + Red", underline=True, color="red"))
