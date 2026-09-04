const {Pool} = require("pg");
const p = new Pool({host:"postgres",port:5432,database:"insforge",user:"rD6YZHXV0wB52Zq4MQ",password:"Jnugi8fKsy8iux3k8W"});
p.query("SELECT 1").then(()=>{console.log("DB_OK");process.exit(0)}).catch(e=>{console.log("DB_FAIL:",e.message);process.exit(1)});