const axios = require("axios");
const cheerio = require("cheerio");
const vm = require("vm");

async function skoleAI(question) {
  if (!question) throw new Error("Question is required.");
  const payload = {
    id: "D4uBrf6hBYxJbBEI",
    messages: [
      {
        role: "system",
        content: "Hey there! What can I help you with?",
        parts: [{ type: "text", text: "Hey there! What can I help you with?" }]
      },
      {
        role: "user",
        content: question,
        parts: [{ type: "text", text: question }]
      }
    ],
    prompt: "chat-for-students",
    promptType: "sanity",
    locale: "en-US",
    inputs: {},
    sessionId: "fef302c8-c388-4637-bb3d-c91f379cdc4f",
    model: "gpt-5-mini",
    anonymousUserId: "46308cbe-21c0-475c-a2bf-a2d338445f70"
  };

  const response = await axios.post(
    "https://skoleapi-py.midgardai.io/chat/",
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        "User-Agent": "Mozilla/5.0"
      },
      responseType: "stream"
    }
  );

  return new Promise((resolve, reject) => {
    let result = "";
    response.data.on("data", (chunk) => {
      const text = chunk.toString();
      const matches = text.match(/0:"(.*?)"/g);
      if (matches) {
        for (const m of matches) {
          const clean = m.replace(/^0:"|"$|\\n/g, "");
          result += clean;
        }
      }
    });
    response.data.on("end", () => {
      if (!result.trim()) result = "Maaf, saya tidak mendapatkan respons yang valid. Silakan coba lagi.";
      resolve(result.trim());
    });
    response.data.on("error", (err) => reject(err));
  });
}

async function turnitin(text) {
  const { data } = await axios.post(
    "https://reilaa.com/api/turnitin-match",
    { text },
    { headers: { "Content-Type": "application/json" } }
  );
  if (!data?.reilaaResult?.value) throw new Error("Hasil tidak ditemukan atau kosong");
  return data.reilaaResult.value;
}

async function baiduSearch(query) {
  if (!query) return [];
  const url = "https://www.baidu.com/s?wd=" + encodeURIComponent(query);
  let res;
  try {
    res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
  } catch {
    return [];
  }
  if (!res?.data) return [];
  const $ = cheerio.load(res.data);
  const results = [];
  $("h3.t").each((i, el) => {
    const title = $(el).text().trim();
    const link = $(el).find("a").attr("href");
    if (title && link) results.push({ title, link });
  });
  return results;
}

async function donghuaSchedule() {
  const { data } = await axios.get("https://donghub.vip/schedule/", {
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 10000
  });
  const $ = cheerio.load(data);
  const results = {};
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  days.forEach((day) => {
    results[day] = [];
    $(`.sch_${day} .bsx`).each((_, el) => {
      const title = $(el).find(".tt").text().trim();
      const link = $(el).find("a").attr("href");
      const episode = $(el).find(".sb.Sub").text().trim();
      const status = $(el).find(".epx").text().trim();
      const img = $(el).find("img").attr("src");
      let countdown = null;
      const countdownElem = $(el).find(".epx.cndwn");
      if (countdownElem.length) {
        const cndwnData = countdownElem.attr("data-cndwn");
        if (cndwnData) countdown = formatCountdown(parseInt(cndwnData));
      }
      results[day].push({
        title: title || "No Title",
        link: link || null,
        episode: episode || "Unknown",
        status: status || "Unknown",
        countdown,
        img: img || null
      });
    });
  });
  const totalDonghua = Object.values(results).reduce((total, dayDonghua) => total + dayDonghua.length, 0);
  const dayNames = {
    sunday: "Sunday",
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday"
  };
  return { totalDonghua, scrapedAt: new Date().toLocaleString("id-ID"), days: dayNames, results };
}

function formatCountdown(seconds) {
  if (!seconds || seconds < 0) return null;
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  let res = "";
  if (d > 0) res += `${d}d `;
  if (h > 0) res += `${h}h `;
  if (m > 0) res += `${m}m`;
  return res.trim() || "Soon";
}

async function tiktokmp3(url) {
  if (!url) throw new Error("URL required");
  const { data } = await axios.post(
    "https://ttsave.app/download",
    { query: url, language_id: "2" },
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0"
      }
    }
  );
  const match = /href=\"(https:\/\/v16-ies-music.tiktokcdn.com\/[^\"]+)\"/g.exec(data);
  if (!match) throw new Error("Audio link not found");
  return match[1];
}

async function hadist(keyword) {
  const { data } = await axios.get(`https://www.hadits.id/tentang/${keyword}`);
  const $ = cheerio.load(data);
  let hasil = [];
  $("section").each((i, el) => {
    let judul = $(el).find("a").text().trim();
    let link = `https://www.hadits.id${$(el).find("a").attr("href")}`;
    let perawi = $(el).find(".perawi").text().trim();
    let kitab = $(el).find("cite").text().replace(perawi, "").trim();
    let teks = $(el).find("p").text().trim();
    hasil.push({ judul, link, perawi, kitab, teks });
  });
  return hasil;
}

async function detailHadist(url) {
  let { data } = await axios.get(url);
  let $ = cheerio.load(data);
  const title = $("article h1").text().trim();
  const breadcrumb = [];
  $("div.breadcrumb-menu ol.breadcrumbs li").each((i, el) => breadcrumb.push($(el).text().trim()));
  const hadithContent = $("article p.rtl").text().trim();
  const hadithNumberMatch = $("header .hadits-about h2").text().match(/No. (\d+)/);
  const hadithNumber = hadithNumberMatch ? hadithNumberMatch[1] : "Tidak diketahui";
  return { title, breadcrumb, haditsArab: hadithContent, hadithNumber };
}

async function searchPrayerCity(query) {
  const { data } = await axios.get("https://www.jadwalsholat.org/jadwal-sholat/monthly.php", {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  const $ = cheerio.load(data);
  const cities = [];
  $('select[name=kota] option').each((i, el) => {
    const id = $(el).attr("value");
    const name = $(el).text().trim();
    if (id && name) cities.push({ id, name, search: name.toLowerCase() });
  });
  const filtered = cities.filter((c) => c.search.includes(query.toLowerCase()));
  return filtered.length > 0 ? filtered[0] : null;
}

async function getPrayerSchedule(cityId) {
  const { data } = await axios.get(`https://www.jadwalsholat.org/jadwal-sholat/monthly.php?id=${cityId}`, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  const $ = cheerio.load(data);
  const cityName = $('select[name=kota] option[selected]').text().trim();
  const today = new Date().getDate();
  let todaySchedule = null;
  $('tr[class^="table_"]').each((i, row) => {
    const cells = $(row).find("td");
    if (cells.length === 9 && parseInt(cells.eq(0).text().trim()) === today) {
      todaySchedule = {
        imsyak: cells.eq(1).text().trim(),
        shubuh: cells.eq(2).text().trim(),
        terbit: cells.eq(3).text().trim(),
        dhuha: cells.eq(4).text().trim(),
        dzuhur: cells.eq(5).text().trim(),
        ashr: cells.eq(6).text().trim(),
        maghrib: cells.eq(7).text().trim(),
        isya: cells.eq(8).text().trim()
      };
    }
  });
  return todaySchedule ? { kota: cityName, jadwal: todaySchedule } : null;
}

async function hubbleSearch(query) {
  if (!query) throw new Error("Query tidak boleh kosong.");
  const { data } = await axios.get(`https://esahubble.org/images/?search=${encodeURIComponent(query)}`, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  const match = data.match(/var\s+images\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) throw new Error("Gagal menemukan array images.");
  const sandbox = { images: [] };
  vm.createContext(sandbox);
  vm.runInContext("images = " + match[1], sandbox);
  const detailed = await Promise.all(
    sandbox.images.map(async (item) => {
      let id = item.url ? item.url.split("/")[item.url.split("/").length - 2] : null;
      if (!id) return item;
      const det = await hubbleDetail(id);
      return { ...item, id, detail: det };
    })
  );
  return { status: true, total: detailed.length, data: detailed[0] || null };
}

async function hubbleDetail(id) {
  const { data } = await axios.get(`https://esahubble.org/images/${id}/`, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  const $ = cheerio.load(data);
  const title = $("h1").first().text().trim();
  const img = $(".archive-image a.popup img");
  const fullImage = $(".archive-image a.popup").attr("href") || null;
  const thumb = img.attr("src") || null;
  const alt = img.attr("alt") || null;
  let description = "";
  $(".archive-image").nextAll("p").each((i, el) => {
    description += $(el).text().trim() + "\n";
  });
  const credit = $(".credit p").text().trim() || null;
  return { id, title, thumb, fullImage, alt, description: description.trim(), credit };
}

module.exports = { skoleAI, turnitin, baiduSearch, donghuaSchedule, tiktokmp3, hadist, detailHadist, searchPrayerCity, getPrayerSchedule, hubbleSearch, hubbleDetail };