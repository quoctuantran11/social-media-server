const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require("fs");
const os = require("os");

const Users = require("../models/users");
const Profiles = require("../models/profiles");

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
        const { user, profile } = req.body;
        const { email, password } = user;
        const { fullName, username } = profile;

        const existedUser = await Users.findOne({ email });
        if (existedUser) {
            return res.status(409).send("Email is used by another account. Try another email.");
        }

        var hashPassword = await bcrypt.hash(password, 10);

        const account = await Users.create({
            email: email.toLowerCase(),
            hash_password: hashPassword,
            created: Date.now().toString()
        });

        await Profiles.create({
            username: username,
            fullName: fullName,
            account: account.id
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

router.post("/login", async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!process.env.USER_TOKEN) {
            const uuidAccess = generateUUID();
            setEnvValue("USER_TOKEN", uuidAccess);
            process.env.USER_TOKEN = uuidAccess;
        }
        if (!process.env.REFRESH_TOKEN) {
            const uuidRefresh = generateUUID();
            setEnvValue("REFRESH_TOKEN", uuidRefresh);
            process.env.REFRESH_TOKEN = uuidRefresh;
        }

        const user = await Users.findOne({ email });
        const userAccount = await Profiles.findOne({ account: user.id })
        if (user && (await bcrypt.compare(password, user.hash_password))) {
            const access_token = jwt.sign(
                {
                    user_id: user._id,
                    email: email
                },
                process.env.USER_TOKEN,
                {
                    expiresIn: "1m",
                    algorithm: "HS256"
                }
            );

            const refresh_token = jwt.sign(
                {
                    user_id: user._id,
                    email: email
                },
                process.env.REFRESH_TOKEN,
                {
                    expiresIn: "1d",
                    algorithm: "HS256"
                }
            );

            user.token = refresh_token;
            Users.findOneAndUpdate(
                { email: email },
                { $set: { token: refresh_token } },
                { new: true }
            ).exec(function(err, doc) {})

            res.cookie('jwt', refresh_token, { httpOnly: true, sameSite: 'None', secure: true, maxAge: 24 * 60 * 60 * 1000 })

            res.status(200).json({
                email: user.email,
                username: userAccount.username,
                name: userAccount.fullName,
                token: access_token
            })
        }
        else {
            res.status(400).send("Invalid credentials");
        }
        next();
    }
    catch (error) {
        console.log(error)
    }
})

router.get("/refresh", async (req, res) => {
    const cookies = req.cookies
    if (!cookies) return res.status(401).send("Unauthorized")
    const refresh = cookies.jwt;

    const user = await Users.findOne({ token: refresh });
    if (!user) return res.status(403).send("Access denied !");

    jwt.verify(refresh, process.env.REFRESH_TOKEN, { algorithms: ["HS256"] },
        (err, decoded) => {
            if (err || user.email !== decoded.email) return res.status(403).send("Access denied !");

            const access_token = jwt.sign(
                {
                    user_id: user._id,
                    email: user.email
                },
                process.env.USER_TOKEN,
                {
                    expiresIn: "1m",
                    algorithm: "HS256"
                }
            );

            res.json({ token: access_token })
        })
})

router.get("/logout", async (req, res) => {
    const cookies = req.cookies
    if (!cookies.jwt) return res.sendStatus(204)
    const refresh = cookies.jwt

    const user = await Users.findOne({ refresh });
    if (!user) {
        res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true })
        return res.sendStatus(204)
    }

    await Users.findOneAndUpdate({ refresh }, { refresh: "" })

    res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true })
    res.sendStatus(204)
})

module.exports = router;