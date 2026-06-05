const axios = require('axios');
async function test() {
    try {
        const res = await axios.get('https://api.siputzx.my.id/api/tools/remini?url=https://i.ibb.co/0Jwqm2p/profile.png');
        console.log(res.data);
    } catch (e) {
        console.error(e.message);
    }
}
test();
