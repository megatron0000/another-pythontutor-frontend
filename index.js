const express = require("express");
const axios = require("axios");

const app = express();

app.use("/node_modules", express.static("node_modules"));

app.get("/visualize", async (req, res) => {
    const code = req.query.code;

    const { data: pyTrace } = await axios.get(`https://pythontutor.com/web_exec_js.py?user_script=${encodeURIComponent(
        code
    )}&options_json={"cumulative_mode":false,"heap_primitives":false,"show_only_outputs":false,"origin":"opt-frontend.js","fe_disableHeapNesting":true,"fe_textualMemoryLabels":false}`)

    res.send(pyTrace);
})

app.use(express.static("frontend"));

app.listen(8123, () => console.log("listening"));
