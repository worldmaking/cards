
# a quick way to dump the AST of a file:

#clang -Xclang -ast-dump -fsyntax-only test.h
#clang -Xclang -ast-dump -fsyntax-only cpp2json.h
#clang -Xclang -ast-dump -fsyntax-only -fparse-all-comments -Wdocumentation test.h
clang -Xclang -ast-dump -fsyntax-only -fparse-all-comments -Wdocumentation -fno-diagnostics-color test.cpp

# this dumps the AST in a binary format
clang++ -v -x c++ -std=c++11 -fparse-all-comments -D__STDC_CONSTANT_MACROS -D__STDC_LIMIT_MACROS -I../clang/6.0.0/include -I../include -emit-ast test.cpp