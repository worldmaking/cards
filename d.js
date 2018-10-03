const fs = require('fs')

stderr = '[master 294b32b] successful compile \n1 file changed, 1 insertion(+), 1 deletion(-)'

console.log(stderr.substring(0,stderr.indexOf(']')+1))