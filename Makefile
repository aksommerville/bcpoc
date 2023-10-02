all:
.SILENT:
PRECMD=echo "  $(@F)" ; mkdir -p $(@D) ;

run:;http-server -a127.0.0.1 -c-1 -s1 src
