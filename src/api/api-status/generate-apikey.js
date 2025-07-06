const axios = require('axios');

module.exports = function(app) {
    const RAW_URL = 'https://raw.githubusercontent.com/hazelnuttty/API/main/sistem.json';

    const validKeys = ['VELIN', 'HAZEL', 'HAZEL GANTENG'];

    function getWaktuSekarang() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
    }

    function getRandomApiKey(list) {
        const aktif = list.filter(item => item.status === 'active');
        if (aktif.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * aktif.length);
        return aktif[randomIndex];
    }

    app.get('/generate/createapikey', async (req, res) => {
        const key = req.query.key;

        if (!key) {
            return res.status(400).json({
                status: false,
                message: 'Parameter key wajib diisi',
                contoh: '/generate/createapikey?key=VELIN'
            });
        }

        const keyLower = key.toLowerCase();
        const validLowerKeys = validKeys.map(k => k.toLowerCase());

        if (!validLowerKeys.includes(keyLower)) {
            return res.status(403).json({
                status: false,
                message: 'Akses ditolak. Key tidak valid.',
                allowed_keys: validKeys
            });
        }

        // tentukan user role berdasarkan key
        const userRole = keyLower === 'velin' ? 'DEVELOPER' : 'ADMIN';

        const waktu = getWaktuSekarang();

        try {
            const { data: list } = await axios.get(RAW_URL);
            const selected = getRandomApiKey(list);

            if (!selected) {
                return res.json({
                    status: false,
                    message: 'Tidak ada apikey yang aktif'
                });
            }

            res.json({
                status: true,
                creator: 'Hazel',
                user: userRole,
                "your apikey": selected.apikey,
                "apikey status": selected.status,
                "expired api": "No expired",
                waktu
            });
        } catch (err) {
            res.status(500).json({ status: false, error: err.message });
        }
    });
};