

// multiploy
template<typename T> 
T foo(T x, T y) {
	return x * y;
}
//test  ss2 33 sss ssds sss ss sss s ss    s ss
int bar(); 

struct Jim {

	struct JJ {
		int x() { return 0; }
	};
	
	int x = 0;
	double y;


	int getx() { return x; }
};

Jim jim;

int bar() {
	jim.x++;
	return 10;
}

int main(int argc, char ** argv) {
	{
		jim.x = 13;
	}
	return foo(jim.getx(), 2);
}

 // test taaaa  sdsd test test rest