# System-wide .bashrc file for interactive bash(1) shells.

# To enable the settings / commands in this file for login shells as well,
# this file has to be sourced in /etc/profile.

# If not running interactively, don't do anything
[ -z "$PS1" ] && return

# check the window size after each command and, if necessary,
# update the values of LINES and COLUMNS.
shopt -s checkwinsize

# set variable identifying the chroot you work in (used in the prompt below)
if [ -z "${debian_chroot:-}" ] && [ -r /etc/debian_chroot ]; then
    debian_chroot=$(cat /etc/debian_chroot)
fi

# set a fancy prompt (non-color, overwrite the one in /etc/profile)
# but only if not SUDOing and have SUDO_PS1 set; then assume smart user.
if ! [ -n "${SUDO_USER}" -a -n "${SUDO_PS1}" ]; then
  PS1='${debian_chroot:+($debian_chroot)}\u@\h:\w\$ '
fi

# Commented out, don't overwrite xterm -T "title" -n "icontitle" by default.
# If this is an xterm set the title to user@host:dir
#case "$TERM" in
#xterm*|rxvt*)
#    PROMPT_COMMAND='echo -ne "\033]0;${USER}@${HOSTNAME}: ${PWD}\007"'
#    ;;
#*)
#    ;;
#esac

# enable bash completion in interactive shells
#if ! shopt -oq posix; then
#  if [ -f /usr/share/bash-completion/bash_completion ]; then
#    . /usr/share/bash-completion/bash_completion
#  elif [ -f /etc/bash_completion ]; then
#    . /etc/bash_completion
#  fi
#fi

# sudo hint
if [ ! -e "$HOME/.sudo_as_admin_successful" ] && [ ! -e "$HOME/.hushlogin" ] ; then
    case " $(groups) " in *\ admin\ *|*\ sudo\ *)
    if [ -x /usr/bin/sudo ]; then
        cat <<-EOF
        To run a command as administrator (user "root"), use "sudo <command>".
        See "man sudo_root" for details.

        EOF
    fi
    esac
fi

# if the command-not-found package is installed, use it
if [ -x /usr/lib/command-not-found -o -x /usr/share/command-not-found/command-not-found ]; then
        function command_not_found_handle {
                # check because c-n-f could've been removed in the meantime
                if [ -x /usr/lib/command-not-found ]; then
                   /usr/lib/command-not-found -- "$1"
                   return $?
                elif [ -x /usr/share/command-not-found/command-not-found ]; then
                   /usr/share/command-not-found/command-not-found -- "$1"
                   return $?
                else
                   printf "%s: command not found\n" "$1" >&2
                   return 127
                fi
        }
fi

# LaaS resource interceptors
# fake_sysconf.so is safe for all programs (KDE RAM display fix)
# libvgpu.so ONLY for CUDA programs (crashes non-CUDA via dlsym hooks)
export LD_PRELOAD="/usr/lib/fake_sysconf.so"
export SYSCONF_INJECTED=1
mkdir -p /tmp/vgpulock 2>/dev/null

# CUDA program wrappers — inject HAMi VRAM/SM enforcement
# IMPORTANT: space-separated, fake_sysconf FIRST (proven working order from Full_Setup.txt)
_HAMI_PRELOAD="/usr/lib/fake_sysconf.so /usr/lib/libvgpu.so"
python3() { LD_PRELOAD="$_HAMI_PRELOAD" command /usr/bin/python3 "$@"; }
python()  { LD_PRELOAD="$_HAMI_PRELOAD" command /usr/bin/python "$@"; }
nvcc()    { LD_PRELOAD="$_HAMI_PRELOAD" command /usr/local/cuda/bin/nvcc "$@"; }
jupyter() { LD_PRELOAD="$_HAMI_PRELOAD" command /usr/bin/jupyter "$@"; }

# Smart sudo wrapper: strip LD_PRELOAD so system tools dont crash
sudo() {
    env -u LD_PRELOAD /usr/bin/sudo "$@"
}

# Package managers: always strip LD_PRELOAD
apt()     { env -u LD_PRELOAD /usr/bin/apt "$@"; }
apt-get() { env -u LD_PRELOAD /usr/bin/apt-get "$@"; }
dpkg()    { env -u LD_PRELOAD /usr/bin/dpkg "$@"; }
pip()     { env -u LD_PRELOAD /usr/bin/pip "$@"; }
pip3()    { env -u LD_PRELOAD /usr/bin/pip3 "$@"; }
