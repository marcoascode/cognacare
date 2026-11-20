import path from 'path';

export interface IEfiCredentials {
    sandbox: boolean;
    client_id: string;
    client_secret: string;
    certificate: string;
    cache: boolean;
}

const credentials: IEfiCredentials = {
    // sandbox: true, // DEVELOPMENT
    // sandbox: false, // PRODUCTION
    // sandbox: true,
    sandbox: false,
    client_id: process.env.EFI_FS_CLIENT_ID as string,
    client_secret: process.env.EFI_FS_CLIENT_SECRET as string, 
    certificate: path.resolve(__dirname, 'certs', process.env.EFI_FS_CERT as string),
    cache: true
};

export default credentials;