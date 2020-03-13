/**
 * worker 计算线程
 * 可以定制worker的计算功能
 */
import { call } from "./utils";

onmessage = function (e) {
    const data = e.data;
    let func = new Function(`return ${data.func}`);
    const r = exec(func(), data.args);
    this.postMessage(r);
}

const exec = function (func, args) {
    try {
        const r = call(func, args);
        return { ok: r }
    } catch (error) {
        return { error }
    }
}