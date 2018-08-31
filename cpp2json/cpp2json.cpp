/*

Useful references:

http://clang.llvm.org/docs/IntroductionToTheClangAST.html
http://clang.llvm.org/doxygen/group__CINDEX.html
https://jonasdevlieghere.com/understanding-the-clang-ast/

http://bastian.rieck.ru/blog/posts/2015/baby_steps_libclang_ast/
http://szelei.me/code-generator/
https://gist.github.com/bparker06/575fa83149eb2cc90375487cfe9f3442

JSON:

https://github.com/nlohmann/json/tree/master

*/

#include <clang-c/Index.h>
#include <clang-c/Documentation.h>
#include <json.hpp>
#include <stdio.h>
#include <stdlib.h>
#include <string> 
#include <fstream>
#include <iostream>

// for convenience
using json = nlohmann::json;

struct VisitorData {
	int indent = 0;
	json * container = 0;
};

CXChildVisitResult visit(CXCursor c, CXCursor parent, CXClientData client_data);

json jdoc = {
	{ "files", json::object() },
	{ "id", 0 },
	{ "ast", "TranslationUnit" },
	{ "nodes", json::array() }
};
CXTranslationUnit unit;
CXFile cfile;
std::string filetext;

int uid() {
	static int id=0;
	return ++id;
}

// turn on to put loc info in the JSON tree
bool doesJsonHaveLocations = true;
bool doesJsonHaveComments = true;
bool doesJsonHaveSources = true;

int main(int argc, const char ** argv) {

	const char * filename = argv[1] ? argv[1] : "test.h";
	const char * outfilename = argv[2] ? argv[2] : "test.json";

	printf("parsing %s into %s\n", filename, outfilename);

	// The TU represents an invocation of the compiler, based on a source file
	// it needs to know what the invocation arguments to the compiler would be:
	/*
	-std=c++11  -DNDEBUG -fno-exceptions -fno-rtti -D__STDC_CONSTANT_MACROS -D__STDC_FORMAT_MACROS -D__STDC_LIMIT_MACROS -stdlib=libc++
	
		char const * args[] = { "-x", "c++", "-std=c++11", " -stdlib=libc++", "-fparse-all-comments", "-D__STDC_CONSTANT_MACROS", "-D__STDC_LIMIT_MACROS", "-I../../include" };
	
	*/
	char const * args[] = { 
		"-v", 
		"-x", "c++", 
		"-std=c++11", 
		"-fparse-all-comments", 
		"-D__STDC_CONSTANT_MACROS", 
		"-D__STDC_LIMIT_MACROS", 
		"-I../clang/6.0.0/include", 
		"-I../include" 
	};
	int nargs = sizeof(args)/sizeof(char *);

	// The index object is our main interface to libclang
	CXIndex index = clang_createIndex(0, 0);

	// see http://www.myopictopics.com/?p=368 for example of adding "unsaved files" to the compilation

	// if we already have a binary AST
	// e.g. by calling clang++ -v -x c++ -std=c++11 -fparse-all-comments -D__STDC_CONSTANT_MACROS -D__STDC_LIMIT_MACROS -I../clang/6.0.0/include -I../include -emit-ast test.cpp
	// we can call this rather than invoking all the command args like above:
	//CXTranslationUnit unit = clang_createTranslationUnit(index, "test.ast");
	
	unsigned parseOptions = CXTranslationUnit_None // see CXTranslationUnit_Flags
  		// | CXTranslationUnit_SkipFunctionBodies 	// uncomment this to skip function bodies
		// | CXTranslationUnit_KeepGoing // don't give up with fatal errors (e.g. missing includes)
		// | CXTranslationUnit_SingleFileParse
		;
	unit = clang_parseTranslationUnit(
		index,
		filename, 
		args, nargs, // command line args
		nullptr, 0, // "unsaved files"
		parseOptions);

	if (!unit) {
		fprintf(stderr, "Unable to parse translation unit. Quitting.\n");
		exit(-1);
	}

	// the parse may have produced errors:
	// Note: even if there were errors, it still generates an AST
	unsigned int numDiagnostics = clang_getNumDiagnostics(unit);
	if (numDiagnostics) {
		// TODO: get AST locations for these.
		// Use clang_getDiagnostic, clang_getDiagnosticSpelling, etc. to get human-readable error messages.
		for ( unsigned int i=0; i < numDiagnostics; i++) {
			CXDiagnostic diag = clang_getDiagnostic(unit, i);
			CXString diagCategory = clang_getDiagnosticCategoryText(diag);
			CXString diagText = clang_getDiagnosticSpelling(diag);
			CXDiagnosticSeverity severity = clang_getDiagnosticSeverity(diag);
			printf( "Diagnostic[%d] - %s(%d)- %s\n", i, clang_getCString(diagCategory), severity, clang_getCString(diagText));
										
			clang_disposeString(diagText);
			clang_disposeString(diagCategory);
			clang_disposeDiagnostic(diag);
		}
	}
	//printf("diagnostics complete\n");

	// To traverse the AST of the TU, we need a Cursor:
	CXCursor cursor = clang_getTranslationUnitCursor(unit);

	// get corresponding file:
	cfile = clang_getFile(unit, filename);
	size_t filesize;
	filetext = clang_getFileContents(unit, cfile, &filesize);
	//printf("%s\n", filetext);
	//printf("file read complete\n");
	// CINDEX_LINKAGE CXFile clang_getIncludedFile(CXCursor cursor); 
	// TODO: deal with includes:
	// for f in unit.get_includes(): print '\t'*f.depth, f.include.name

	// store node's location in the JSON?
	if (doesJsonHaveLocations) {
		// get location info:
		// Note: loc might not be the start of the range (e.g. it could be the where the name of a function is)
		CXSourceLocation loc = clang_getCursorLocation(cursor);
		CXSourceRange range = clang_getCursorExtent(cursor);
		CXSourceLocation start = clang_getRangeStart(range);
		CXSourceLocation end = clang_getRangeEnd(range);
		CXFile file;
		unsigned line, column, offset;
		unsigned line1, column1, offset1;
		clang_getSpellingLocation(start, &file, &line, &column, &offset);
		clang_getSpellingLocation(end, &file, &line1, &column1, &offset1);
		CXString filepath = clang_getFileName(file);
		jdoc["loc"] = { 
			{"filepath", clang_getCString(filepath) },
			{"begin", { {"line", line}, {"col", column}, {"char", offset} } }, 
			{"end", { {"line", line1}, {"col", column1}, {"char", offset1} } }
		};
	}

	// visit all the tree starting from the unit root:
	VisitorData vd;
	vd.container = &jdoc["nodes"];
	//printf("begin visit\n");
	clang_visitChildren(cursor, visit, &vd);
	//printf("json complete\n");

	// add all the file sources:


	//if (file == cfile) jnode["text"] = filetext.substr(offset, offset1-offset);

	// cleanup:
	clang_disposeTranslationUnit(unit);
	clang_disposeIndex(index);

	// save JSON to disk:
	//printf("%s\n\n", jdoc.dump(3).c_str());
	std::ofstream ofile(outfilename);
	ofile << std::setw(4) << jdoc << std::endl;
	ofile.close();

	// TODO: return a useful indicator of error/success here!

	return 0;
}

/*
	This function is called for each node of the AST

	Return CXChildVisit_Break to stop traversal, CXChildVisit_Continue to continue traversing the siblings of the current cursor without visiting its children, or CXChildVisit_Recurse to visit the children of the current cursor
*/

CXChildVisitResult visit(CXCursor c, CXCursor parent, CXClientData client_data) {

	VisitorData& vd = *(VisitorData *)client_data;
	json& jsiblings = (*vd.container);
	bool doVisitChildren = true;
	CXCursorKind kind = clang_getCursorKind(c);

	if (clang_isUnexposed(kind)) {
		// this is an AST node that has no useful information for CIndex
		// so we can continue to visit the children directly:
		//clang_visitChildren(c, visit, client_data);
		return CXChildVisit_Recurse;
	}

	//unsigned clang_isDeclaration(enum CXCursorKind);
	//CINDEX_LINKAGE unsigned clang_isReference(enum CXCursorKind);
	
	// get more node info:
	CXString kind_str = clang_getCursorKindSpelling(kind);
	CXString name_str = clang_getCursorSpelling(c);
	const char * name = clang_getCString(name_str);
	// C++ type; may be invalid, unexposed, a built-in like int, float etc, or more
	CXType ctype = clang_getCursorType(c);
	CXString ctype_str = clang_getTypeSpelling(ctype);

	// get location info:
	// Note: loc might not be the start of the range (e.g. it could be the where the name of a function is)
	CXSourceLocation loc = clang_getCursorLocation(c);
	CXSourceRange range = clang_getCursorExtent(c);
	CXSourceLocation start = clang_getRangeStart(range);
	CXSourceLocation end = clang_getRangeEnd(range);
	CXFile file;
	unsigned line, column, offset;
	unsigned line1, column1, offset1;
	clang_getSpellingLocation(start, &file, &line, &column, &offset);
	clang_getSpellingLocation(end, &file, &line1, &column1, &offset1);
	CXString filepath = clang_getFileName(file);
	const char * filepath_cstr = clang_getCString(filepath);
  	
	//printf("%s%s in %s from line %d:%d to line %d:%d:%s of type: <%s>\n", std::string(vd.indent,'-').c_str(), clang_getCString(kind_str), clang_getCString(filepath), line, column, line1, column1, name, clang_getCString(ctype_str));
	clang_disposeString(kind_str);

	// has this file been added to the jdoc yet?
	//f (!clang_Location_isInSystemHeader(loc)) { // don't add system header sources?
		if (doesJsonHaveSources && jdoc["files"].find(filepath_cstr) == jdoc["files"].end()) {
			size_t filesize;
			jdoc["files"][filepath_cstr] = clang_getFileContents(unit, file, &filesize);
		}
	//}

	// create a node in the JSON for this AST node
	json jnode = {
		{ "ast", clang_getCString(kind_str) },
		{ "id", uid() }
	};
	// store node's location in the JSON?
	if (doesJsonHaveLocations) {
		jnode["loc"] = { 
			{"filepath", clang_getCString(filepath) },
			{"begin", { {"line", line}, {"col", column}, {"char", offset} } }, 
			{"end", { {"line", line1}, {"col", column1}, {"char", offset1} } }
		};
	}
	// store name, if given:
	if (strlen(name)) { jnode["name"] = name; }
	// check for comments:
	if (doesJsonHaveComments && clang_isDeclaration(kind)) {
		auto comment = clang_Cursor_getParsedComment(c);
		auto commentkind = clang_Comment_getKind(comment);
		if (commentkind) {
			// 	There's quite a bit of parsing of comment types available in clang-c's Documentation.h
			// 	such as params, embedded code, html tags, etc.
			// 	A comment itself can thus be explored as an AST containing these tokens
			// the simplest option:
			auto rawcomment = clang_Cursor_getRawCommentText(c);
			jnode["comment"] = { clang_getCString(rawcomment) };
		}
	}
	// store type, if given:
	if (ctype.kind) {
		// clang_getCanonicalType
		// clang_isConstQualifiedType
		// clang_isPODType
		jnode["type"] = clang_getCString(ctype_str);
	}

	if (clang_isDeclaration(kind)) jnode["isDecl"] = true;
	if (clang_isExpression(kind)) jnode["isExpr"] = true;
	if (clang_isStatement(kind)) jnode["isStat"] = true;

	switch(kind) {
	case CXCursor_FunctionDecl:
	case CXCursor_CXXMethod: {
		// for a functiondecl 
		// clang_getFunctionTypeCallingConv
		// clang_isFunctionTypeVariadic
		// clang_getResultType
		CXType rtype = clang_getResultType(ctype);
		jnode["type_ret"] = clang_getCString(clang_getTypeSpelling(rtype));
		int nargs = clang_getNumArgTypes(ctype);
		auto args = json::array();
		for (int i=0; i<nargs; i++) {
			CXType atype = clang_getArgType(ctype, i);
			args.push_back(clang_getCString(clang_getTypeSpelling(atype)));
		}
		jnode["type_args"] = args;
 
		// clang_Cursor_getNumArguments, clang_Cursor_getArgument
		// clang_getCursorResultType
		jnode["mangled_name"] = clang_getCString(clang_Cursor_getMangling(c));
	
	} break;
	case CXCursor_CompoundStmt: {
		//if (file == cfile) jnode["text"] = filetext.substr(offset, offset1-offset);
		//doVisitChildren = false;
	} break;
	case CXCursor_FieldDecl:  {
		//jnode["offsetof"] = clang_Type_getOffsetOf(clang_getCursorType(parent), name) / 8;
		jnode["offsetof"] = clang_Cursor_getOffsetOfField(c) / 8;
		jnode["sizeof"] = clang_Type_getSizeOf(ctype);
	} break;
	case CXCursor_FloatingLiteral:
	case CXCursor_IntegerLiteral: 
	case CXCursor_StringLiteral: 
	case CXCursor_CharacterLiteral: {

		CXEvalResult res = clang_Cursor_Evaluate(c);
		CXEvalResultKind ekind = clang_EvalResult_getKind(res);
		//printf("literal ekind %d %d\n", ekind, CXEval_Int);
		switch (ekind) {
			case CXEval_Int:
				if (clang_Type_getSizeOf(ctype) > sizeof(int)) {
					unsigned u = clang_EvalResult_isUnsignedInt(res);
					jnode["value"] = u ? u : clang_EvalResult_getAsLongLong(res);
				} else {
					unsigned long long u = clang_EvalResult_getAsUnsigned(res);
					jnode["value"] = u ? u : clang_EvalResult_getAsLongLong(res);
				}
				break;				
			case CXEval_Float:
				jnode["value"] = clang_EvalResult_getAsDouble(res);
				break;
			case CXEval_ObjCStrLiteral:
			case CXEval_StrLiteral:
			case CXEval_CFStr: 
			case CXEval_Other:
			{
				const char * val = clang_EvalResult_getAsStr(res);
				if (val) jnode["value"] = clang_EvalResult_getAsStr(res);
			} break;
			default: {
				// just copy the source?

			} break;
		}
		clang_EvalResult_dispose(res);
	} break;
	default:
	break;

	}

	// TODO
	// would be better to handle this somehow via `return CXChildVisit_Recurse`
	// to avoid highly recursive stack stuff
	// but it's not clear how the `jnode["nodes"] = jkids;` would happen in that case.
	if (doVisitChildren) {
		json jkids = json::array();
		VisitorData vd1;
		vd1.indent = vd.indent+1;
		vd1.container = &jkids;
		clang_visitChildren(c, visit, &vd1);

		/*
			Thoughts: 
			- it would be nice to avoid the singular CompoundStmt that all function bodies have, and just say function.body = [], but I can't fingure out how to avoid it. CompoundStmt can appear in other blocks of code and shouldn't be skipped, as it provides scope. I guess if we know the current cursor is a function, we can analyze the types of the children in a more nuanced way rather than assigning to [nodes]?
		*/
		if (jkids.size()) {
			jnode["nodes"] = jkids;
		}
	}

	jsiblings.push_back(jnode);

	// default behavior: continue to next sibling
	return CXChildVisit_Continue;
}