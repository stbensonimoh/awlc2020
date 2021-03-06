"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config = __importStar(require("./config"));
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const express_formidable_1 = __importDefault(require("express-formidable"));
const typeorm_1 = require("typeorm");
const typeorm_2 = require("typeorm");
const Delegate_1 = require("../entity/Delegate");
const envConfig = __importStar(require("../envConfig"));
const axios_1 = __importDefault(require("axios"));
const payment_1 = require("../modules/payment");
const send_sms_email_1 = require("../modules/send-sms-email");
typeorm_1.createConnection();
const app = express_1.default();
exports.app = app;
const indexRouter = express_1.default.Router();
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    next();
});
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use(body_parser_1.default.json());
app.use((req, res, next) => {
    console.log("server started successfully");
    next();
});
// extra functions
const name = (firstName, lastName) => {
    return `${firstName} ${lastName}`;
};
//get routes
indexRouter.get("/", (req, res) => {
    console.log(req.query);
    res.send("Working on the server");
});
indexRouter.post("/verify", (req, res) => {
    const reqbody = req.query;
    // console.log(reqbody);
    const { txref } = reqbody;
    //   console.log(txref);
    try {
        axios_1.default
            .post(`https://api.ravepay.co/flwv3-pug/getpaidx/api/v2/verify?txref=${txref}`, {
            txref: txref,
            SECKEY: envConfig.secretKey
        }, {
            headers: {
                "Content-Type": "application/json"
            }
        })
            .then((response) => __awaiter(void 0, void 0, void 0, function* () {
            console.log(response);
            if (response.data.data.status === "successful" &&
                response.data.data.chargecode == "00") {
                // console.log("wow wow");
                const sendSmsEmail = new send_sms_email_1.SendSmsEmail();
                let delegate = new Delegate_1.Delegate();
                let delegateRepository = typeorm_2.getRepository(Delegate_1.Delegate);
                delegate.email = response.data.data.custemail;
                // console.log(delegate);
                yield delegateRepository.update({ email: delegate.email }, { paid: "yes", paidAt: new Date() });
                // console.log(delegateRepository);
                let savedUser = yield delegateRepository.findOne({
                    email: delegate.email
                });
                console.log(savedUser);
                res.redirect("https://awlo.org/awlc");
                //send sms
                sendSmsEmail.email_sms(savedUser, "verified");
            }
        })).catch(err => {
            console.log(`no mention dis gbege - ${err}`);
        });
    }
    catch (error) {
        console.log(error);
    }
});
//post routes
indexRouter.post("/register", express_formidable_1.default(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // console.log(req.fields);
    const data = req.fields;
    let delegate = new Delegate_1.Delegate();
    delegate.firstName = data.firstName;
    delegate.lastName = data.lastName;
    delegate.email = data.email;
    delegate.phone = data.full_phone;
    delegate.country = data.country;
    delegate.occupation = data.occupation;
    delegate.organisation = data.organisation;
    delegate.member = data.member;
    delegate.referringChannel = data.referringChannel;
    delegate.firstConference = data.firstConference;
    delegate.membershipCode = data.membershipCode;
    delegate.referrer = data.referrer;
    let delegateRepository = typeorm_2.getRepository(Delegate_1.Delegate);
    yield delegateRepository.save(delegate);
    console.log("User has been saved");
    const sendSmsEmail = new send_sms_email_1.SendSmsEmail(); //send sms
    sendSmsEmail.email_sms(delegate, "not_verified");
    try {
        const payment = new payment_1.Payment();
        yield payment
            .start(delegate, 126875, "NGN")
            .then(response => {
            console.log(response.data.data.link);
            res.json(response.data.data.link);
        })
            .catch(err => {
            console.log(`hahahah wetin you think for this ${err}`);
        });
    }
    catch (error) {
        console.log(`nah for catch block ooo -> ${error}`);
    }
}));
indexRouter.post("/checkuser", express_formidable_1.default(), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    //   console.log(req.fields);
    let delegateRepository = typeorm_1.getConnection().getRepository(Delegate_1.Delegate);
    let singleDelegate = yield delegateRepository.findOne({
        email: req.fields.email
    });
    console.log("Delegate: ", singleDelegate);
    if (singleDelegate) {
        if (singleDelegate.paid === "yes") {
            res.send(JSON.stringify("user_exists"));
        }
        else if (singleDelegate !== undefined) {
            try {
                const payment = new payment_1.Payment();
                yield payment
                    .start(singleDelegate, 126875, "NGN")
                    .then(response => {
                    console.log(response.data.data.link);
                    res.json(response.data.data.link);
                })
                    .catch(err => {
                    console.log(`hahahah wetin you think for this ${err}`);
                });
            }
            catch (error) {
                console.log(`nah for catch block ooo -> ${error}`);
            }
            //   res.send(JSON.stringify("user_exist_but_not_paid"));
        }
    }
    else if (singleDelegate == undefined) {
        res.send(JSON.stringify("no_user"));
        console.log(`yawa - ${singleDelegate}`);
    }
}));
app.use(config.baseUrl, indexRouter);
