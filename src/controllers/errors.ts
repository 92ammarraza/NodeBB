

import nconf from 'nconf';
import winston from 'winston';
import validator from 'validator';
import { Request, Response, NextFunction } from 'express';
import translator from '../translator';
import plugins from '../plugins';
import middleware from '../middleware';
import middlewareHelpers from '../middleware/helpers';
import helpers from './helpers';


export const handleURIErrors = async function (err: Error, req: Request, res: Response, next: NextFunction) {
    // Handle cases where malformed URIs are passed in
    if (err instanceof URIError) {
        const cleanPath = req.path.replace(new RegExp(`^${nconf.get('relative_path') as string}`), '');
        const tidMatch = cleanPath.match(/^\/topic\/(\d+)\//);
        const cidMatch = cleanPath.match(/^\/category\/(\d+)\//);
        if (tidMatch) {
            res.redirect(String(nconf.get('relative_path')) + String(tidMatch[0]));
        } else if (cidMatch) {
            res.redirect(String(nconf.get('relative_path')) + String(cidMatch[0]));
        } else {
            winston.warn(`[controller] Bad request: ${req.path}`);
            if (req.path.startsWith(`${nconf.get('relative_path') as string}/api`)) {
                res.status(400).json({
                    error: '[[global:400.title]]',
                });
            } else {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
                await middleware.buildHeaderAsync(req, res);
                res.status(400).render('400', { error: validator.escape(String(err.message)) });
            }
        }
    } else {
        next(err);
    }
};


async function getErrorHandlers(cases: { [key: string]: () => void }) {
    try {
        return await plugins.hooks.fire('filter:error.handle', {
            cases: cases,
        }) as { [key: string]: () => void };
    } catch (err) {
        // Assume defaults
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        winston.warn(`[errors/handle] Unable to retrieve plugin handlers for errors: ${err.message as string}`);
        return { cases };
    }
}

// this needs to have four arguments or express treats it as `(req, res, next)`
// don't remove `next`!
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handleErrors = async function (err, req: Request, res: Response, next: NextFunction) {
    const cases: { [key: string]: () => void } = {
        EBADCSRFTOKEN: function () {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            winston.error(`${req.method} ${req.originalUrl}\n${err.message as string}`);
            res.sendStatus(403);
        },
        'blacklisted-ip': function () {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            res.status(403).type('text/plain').send(err.message);
        },
    };
    const defaultHandler = async function (err) {
        if (res.headersSent) {
            return;
        }
        // Display NodeBB error page
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const status = parseInt(err.status as string, 10);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        if ((status === 302 || status === 308) && err.path) {
            return res.locals.isAPI ?
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
                res.set('X-Redirect', String(err.path)).status(200).json(String(err.path)) :
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
                res.redirect(String(nconf.get('relative_path')) + String(err.path));
        }

        const path = String(req.path || '');

        if (path.startsWith(`${nconf.get('relative_path') as string}/api/v3`)) {
            let status = 500;
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
            if (err.message.startsWith('[[')) {
                status = 400;
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
                err.message = await translator.translate(err.message);
            }
            return helpers.formatApiResponse(status, res, err);
        }

        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
        winston.error(`${req.method} ${req.originalUrl}\n${err.stack as string}`);
        res.status(status || 500);
        const data = {
            path: validator.escape(path),
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
            error: validator.escape(String(err.message)),
            bodyClass: middlewareHelpers.buildBodyClass(req, res) as string,
        };
        if (res.locals.isAPI) {
            res.json(data);
        } else {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            await middleware.buildHeaderAsync(req, res);
            res.render('500', data);
        }
    };

    const data = await getErrorHandlers(cases) as { [key: string]: () => void };

    try {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        if (data.cases.hasOwnProperty(err.code as string)) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            data.cases[err.code as string](err, req, res, defaultHandler);
        } else {
            await defaultHandler(err);
        }
    } catch (_err) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        winston.error(`${req.method} ${req.originalUrl}\n${_err.stack as string}`);
        if (!res.headersSent) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            res.status(500).send(_err.message);
        }
    }
};


