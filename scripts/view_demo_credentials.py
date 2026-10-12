"""Private, read-only Shell viewer. Never run with output capture or recording."""

import curses
import json
import os
import stat
import sys
import time
from pathlib import Path

SOURCE = Path("/tmp/yieldloop-preview-credentials.json")


def read_manager(path):
    """Read only an owner-private regular file; never include values in errors."""
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        info = os.fstat(fd)
        if (
            not stat.S_ISREG(info.st_mode)
            or info.st_uid != os.getuid()
            or info.st_mode & 0o077
            or info.st_size > 16384
        ):
            raise ValueError("Unsafe credential file")
        with os.fdopen(fd, encoding="utf-8") as stream:
            fd = None
            data = json.loads(stream.read(16385))
        manager = data["manager"]
        values = (manager["username"], manager["password"])
        if any(not isinstance(v, str) or not v or len(v) > 256 or not v.isprintable() for v in values):
            raise ValueError("Invalid credential structure")
        return values
    finally:
        if fd is not None:
            os.close(fd)


def screen(stdscr):
    stdscr.timeout(1000)
    try:
        curses.curs_set(0)
    except curses.error:
        pass
    values = None
    failed = False
    revealed = False
    deadline = time.monotonic() + 60
    try:
        while time.monotonic() < deadline:
            stdscr.erase()
            lines = [
                "Private demo login — read-only",
                "Do not use while screen sharing or recording this terminal.",
                "Press V to reveal. Q or Esc exits. Screen closes within 60 seconds.",
                "",
            ]
            if failed:
                lines.append("Cannot safely read credentials. No account or file was changed.")
            elif revealed:
                lines.extend((f"Username: {values[0]}", f"Password: {values[1]}"))
            else:
                lines.append("Credentials hidden.")
            height, width = stdscr.getmaxyx()
            if height < len(lines) + 1 or width < max(map(len, lines)) + 1:
                lines = ["Enlarge terminal to view. Q exits."]
            for row, line in enumerate(lines[:max(0, height - 1)]):
                stdscr.addnstr(row, 0, line, max(0, width - 1))
            stdscr.refresh()
            key = stdscr.getch()
            if key in (ord("q"), ord("Q"), 27):
                break
            if key in (ord("v"), ord("V")) and not revealed and not failed:
                try:
                    values = read_manager(SOURCE)
                    revealed = True
                except Exception:  # noqa: BLE001 -- secret-bearing errors must never escape.
                    # Never render exception details, which could contain data.
                    failed = True
    finally:
        stdscr.erase()
        stdscr.refresh()


def main():
    # Check before opening the secret file. Agent capture, pipes and redirection
    # must never receive credentials. curses uses the terminal's alternate screen.
    if not all(stream.isatty() for stream in (sys.stdin, sys.stdout, sys.stderr)):
        sys.stderr.write("Run this viewer directly in your private interactive Shell; no pipes or redirection.\n")
        return 2
    try:
        curses.wrapper(screen)
    except KeyboardInterrupt:
        pass
    except Exception:  # noqa: BLE001 -- suppress secret-bearing tracebacks.
        sys.stderr.write("Viewer closed. No accounts or credentials were modified.\n")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
