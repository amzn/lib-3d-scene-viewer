import CopyWebpackPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default (env, argv) => {
    const isProd = env.production || false;

    const plugins = [
        new HtmlWebpackPlugin({
            template: './src/dev/viewer.html',
            filename: 'index.html',
            chunks: ['index'],
        }),
        new HtmlWebpackPlugin({
            template: './src/dev/viewer.html',
            filename: 'v3dViewer.html',
            chunks: ['v3dViewer'],
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'public', to: 'public' },
                { from: 'docs', to: 'docs', noErrorOnMissing: true },
            ],
        }),
    ];

    return {
        mode: isProd ? 'production' : 'development',
        devtool: isProd ? false : 'eval-cheap-module-source-map',
        entry: {
            index: './src/dev/index.ts',
            v3dViewer: './src/dev/v3dViewer.ts',
        },
        output: {
            path: path.resolve(__dirname, 'web'),
            filename: '[name].bundle.js',
            clean: true,
        },
        optimization: {
            splitChunks: {
                chunks: 'all',
            },
        },
        resolve: {
            extensions: ['.tsx', '.js', '.ts'],
        },
        module: {
            rules: [
                {
                    test: /\.css$/,
                    use: ['style-loader', 'css-loader'],
                },
                {
                    test: /\.(png|svg|jpg|gif|gltf|bin|env|peg|woff|woff2|eot|ttf)$/,
                    use: ['file-loader'],
                },
                {
                    test: /\.tsx?$/,
                    loader: 'ts-loader',
                },
            ],
        },
        devServer: {
            static: [{
                directory: path.resolve(__dirname, 'public'),
                publicPath: '/public',
            }, {
                directory: path.resolve(__dirname, 'docs'),
                publicPath: '/docs',
            }],
            compress: false,
            open: 'index.html',
            port: 8443,
            server: 'http',
            hot: true,
            liveReload: true,
            historyApiFallback: false,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
        },
        plugins: plugins,
    };
};
