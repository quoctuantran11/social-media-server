const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require("fs");
const os = require("os");
const auth = require('../middleware/auth');

const Users = require("../models/users");

// for more information: http://stackoverflow.com/a/8809472
const generateUUID = () => {
    let
        d = new Date().getTime(),
        d2 = (performance && performance.now && (performance.now() * 1000)) || 0;
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        let r = Math.random() * 16;
        if (d > 0) {
            r = (d + r) % 16 | 0;
            d = Math.floor(d / 16);
        } else {
            r = (d2 + r) % 16 | 0;
            d2 = Math.floor(d2 / 16);
        }
        return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
    });
};

function setEnvValue(key, value) {
    // read file from hdd & split if from a linebreak to a array
    const ENV_VARS = fs.readFileSync("./.env", "utf8").split(os.EOL);

    // find the env we want based on the key
    const target = ENV_VARS.indexOf(ENV_VARS.find((line) => {
        return line.match(new RegExp(key));
    }));

    if (target != -1) {
        // replace the key/value with the new value
        ENV_VARS.splice(target, 1, `${key}=${value}`);
    }
    else {
        ENV_VARS.push(`${key}=${value}`);
    }

    // write everything back to the file system
    fs.writeFileSync("./.env", ENV_VARS.join(os.EOL));
}

router.post("/register", async (req, res) => {
    try {
        const { email, password } = req.body;

        const existed = await Users.findOne({ email });
        if (existed) {
            return res.status(409).send("Email is used by another account. Try another email.");
        }

        var hashPassword = await bcrypt.hash(password, 10);

        const user = await Users.create({
            email: email.toLowerCase(),
            hash_password: hashPassword,
            created: Date.now().toString()
        });

        const token = jwt.sign(
            { user_id: user._id, email },
            generateUUID(),
            {
                expiresIn: "1h",
            }
        )

        user.token = token;

        res.status(201).json({
            email: user.email,
            token: user.token,
            created: user.created
        })
    }
    catch (error) {
        console.log(error)
    }
})

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const uuid = generateUUID();

        const user = await Users.findOne({ email });
        if (user && (await bcrypt.compare(password, user.hash_password))) {
            const token = jwt.sign(
                { user_id: user._id, email },
                uuid,
                {
                    expiresIn: "1h",
                    algorithm: "HS256"
                }
            );

            user.token = token;
            setEnvValue("USER_TOKEN", uuid);
            process.env.USER_TOKEN = uuid;

            res.status(200).json({
                email: user.email,
                token: user.token,
                created: user.created
            });
        }
        else {
            res.status(400).send("Invalid credentials");
        }
    }
    catch (error) {
        console.log(error)
    }
})

router.get("/home", auth, (req, res) => {
    res.status(200).send("Home page");
})

module.exports = router;