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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleErrors = exports.handleURIErrors = void 0;
const nconf_1 = __importDefault(require("nconf"));
const winston_1 = __importDefault(require("winston"));
const validator_1 = __importDefault(require("validator"));
const translator_1 = __importDefault(require("../translator"));
const plugins_1 = __importDefault(require("../plugins"));
const middleware_1 = __importDefault(require("../middleware"));
const helpers_1 = __importDefault(require("../middleware/helpers"));
const helpers_2 = __importDefault(require("./helpers"));
const handleURIErrors = function (err, req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        // Handle cases where malformed URIs are passed in
        if (err instanceof URIError) {
            const cleanPath = req.path.replace(new RegExp(`^${nconf_1.default.get('relative_path')}`), '');
            const tidMatch = cleanPath.match(/^\/topic\/(\d+)\//);
            const cidMatch = cleanPath.match(/^\/category\/(\d+)\//);
            if (tidMatch) {
                res.redirect(String(nconf_1.default.get('relative_path')) + String(tidMatch[0]));
            }
            else if (cidMatch) {
                res.redirect(String(nconf_1.default.get('relative_path')) + String(cidMatch[0]));
            }
            else {
                winston_1.default.warn(`[controller] Bad request: ${req.path}`);
                if (req.path.startsWith(`${nconf_1.default.get('relative_path')}/api`)) {
                    res.status(400).json({
                        error: '[[global:400.title]]',
                    });
                }
                else {
                    // The next line calls a function in a module that has not been updated to TS yet
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
                    yield middleware_1.default.buildHeaderAsync(req, res);
                    res.status(400).render('400', { error: validator_1.default.escape(String(err.message)) });
                }
            }
        }
        else {
            next(err);
        }
    });
};
exports.handleURIErrors = handleURIErrors;
function getErrorHandlers(cases) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield plugins_1.default.hooks.fire('filter:error.handle', {
                cases: cases,
            });
        }
        catch (err) {
            // Assume defaults
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            winston_1.default.warn(`[errors/handle] Unable to retrieve plugin handlers for errors: ${err.message}`);
            return { cases };
        }
    });
}
// this needs to have four arguments or express treats it as `(req, res, next)`
// don't remove `next`!
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const handleErrors = function (err, req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const cases = {
            EBADCSRFTOKEN: function () {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                winston_1.default.error(`${req.method} ${req.originalUrl}\n${err.message}`);
                res.sendStatus(403);
            },
            'blacklisted-ip': function () {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                res.status(403).type('text/plain').send(err.message);
            },
        };
        const defaultHandler = function (err) {
            return __awaiter(this, void 0, void 0, function* () {
                if (res.headersSent) {
                    return;
                }
                // Display NodeBB error page
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                const status = parseInt(err.status, 10);
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                if ((status === 302 || status === 308) && err.path) {
                    return res.locals.isAPI ?
                        // The next line calls a function in a module that has not been updated to TS yet
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
                        res.set('X-Redirect', String(err.path)).status(200).json(String(err.path)) :
                        // The next line calls a function in a module that has not been updated to TS yet
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
                        res.redirect(String(nconf_1.default.get('relative_path')) + String(err.path));
                }
                const path = String(req.path || '');
                if (path.startsWith(`${nconf_1.default.get('relative_path')}/api/v3`)) {
                    let status = 500;
                    // The next line calls a function in a module that has not been updated to TS yet
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
                    if (err.message.startsWith('[[')) {
                        status = 400;
                        // The next line calls a function in a module that has not been updated to TS yet
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
                        err.message = yield translator_1.default.translate(err.message);
                    }
                    return helpers_2.default.formatApiResponse(status, res, err);
                }
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
                winston_1.default.error(`${req.method} ${req.originalUrl}\n${err.stack}`);
                res.status(status || 500);
                const data = {
                    path: validator_1.default.escape(path),
                    // The next line calls a function in a module that has not been updated to TS yet
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
                    error: validator_1.default.escape(String(err.message)),
                    bodyClass: helpers_1.default.buildBodyClass(req, res),
                };
                if (res.locals.isAPI) {
                    res.json(data);
                }
                else {
                    // The next line calls a function in a module that has not been updated to TS yet
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                    yield middleware_1.default.buildHeaderAsync(req, res);
                    res.render('500', data);
                }
            });
        };
        const data = yield getErrorHandlers(cases);
        try {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            if (data.cases.hasOwnProperty(err.code)) {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                data.cases[err.code](err, req, res, defaultHandler);
            }
            else {
                yield defaultHandler(err);
            }
        }
        catch (_err) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            winston_1.default.error(`${req.method} ${req.originalUrl}\n${_err.stack}`);
            if (!res.headersSent) {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                res.status(500).send(_err.message);
            }
        }
    });
};
exports.handleErrors = handleErrors;
