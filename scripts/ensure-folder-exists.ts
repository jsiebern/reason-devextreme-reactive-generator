import { mkdir } from 'fs';
import ErrnoException = NodeJS.ErrnoException;

export default function ensureExists(path: string, mask: any, cb: (err: null | ErrnoException ) => void) {
    mkdir(path, mask, err => {
        if (err) {
            if (err.code === 'EEXIST') {
                cb(null); // ignore the error if the folder already exists
            } else {
                cb(err); // something else went wrong
            }
        } else {
            cb(null); // successfully created folder
        }
    });
}
