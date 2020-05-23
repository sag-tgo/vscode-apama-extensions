const axios = require('axios').default;
import { DOMParser } from 'xmldom';
import * as xpath from 'xpath';
import { OutputChannel } from 'vscode';

export interface CorrelatorBreakpoint {
    filename: string;
    filehash: string;
    action: string;
    owner: string;
    line: number;
    id: string;
    breakonce: boolean;
}

export interface CorrelatorContextState {
    context: string;
    contextid: number;
    paused: boolean;
}

export interface CorrelatorPaused extends CorrelatorContextState {
    owner: string;
    type: string;
    action: string;
    instance: number;
    monitor: string;
    filename: string;
    filehash: string;
    reason: string;
    line: number;
}

export interface CorrelatorStackFrame {
    owner: string;
    type: string;
    action: string;
    lineno: number;
    filename: string;
    filehash: string;
}

export interface CorrelatorStackTrace {
    contextid: number;
    monitor: string;
    stackframes: CorrelatorStackFrame[];
}

export interface CorrelatorVariable {
    name: string;
    type: string;
    value: string;
}

export class CorrelatorHttpInterface {
    private url: string;
    constructor(private logger:OutputChannel, host: string, port: number) {
        this.url = `http://${host}:${port}`;
    }

    /** Sets a breakpoint and returns the id of the breakpoint. Throws an exception on error or failure. */
    public async setBreakpoint(filepath: string, line: number): Promise<string> {
        const body = '<map name="apama-request">' +
            `<prop name="filename">${filepath}</prop>` +
            `<prop name="line">${line}</prop>` +
            '<prop name="breakonce">true</prop>' +
        '</map>';

        return axios.put(`${this.url}/correlator/debug/breakpoint/location`, { body })
            .then((response: string) => new DOMParser().parseFromString(response, 'text/xml'))
            .then((dom: any) => xpath.select1('string(/map[@name="apama-response"]/list[@name="ids"]/prop[@name="id"]//text())', dom));
    }

    public async getAllSetBreakpoints(): Promise<CorrelatorBreakpoint[]> {
        return axios.get(`${this.url}/correlator/debug/breakpoint`)
            .then((response: string) => new DOMParser().parseFromString(response, 'text/xml'))
            .then((dom: any) => xpath.select('/map[@name="apama-response"]/list[@name="breakpoints"]/map[@name="filebreakpoint"]', dom))
            // Have to convert the found breakpointNodes back to a string and then back to dom because this xpath implementation only finds from root node
            .then((breakpointNodes: any[]) => breakpointNodes.map((breakpointNode: { toString: () => any; }) => breakpointNode.toString()))
            .then((bpStrings: any[]) => bpStrings.map((bpString: string) => new DOMParser().parseFromString(bpString, 'text/xml')))
            .then((breakpointDoms: any[]) => breakpointDoms.map((breakpointDom: any) => ({
                    filename: xpath.select1('string(/map/prop[@name="filename"])', breakpointDom),
                    filehash: xpath.select1('string(/map/prop[@name="filehash"])', breakpointDom),
                    action: xpath.select1('string(/map/prop[@name="action"])', breakpointDom),
                    owner: xpath.select1('string(/map/prop[@name="owner"])', breakpointDom),
                    line: parseInt(xpath.select1('string(/map/prop[@name="line"])', breakpointDom)),
                    id: xpath.select1('string(/map/prop[@name="id"])', breakpointDom),
                    breakonce: xpath.select1('string(/map/prop[@name="breakonce"])', breakpointDom) === 'true'
                })
            ));
    }

    public async enableDebugging(): Promise<void> {
        const body = '<map name="apama-request"></map>';
        return axios.put(`${this.url}/correlator/debug/state`, { body });
    }

    public async pause(): Promise<void> {
        const body = '<map name="apama-request"></map>';
        return axios.put(`${this.url}/correlator/debug/progress/stop`, { body });
    }

    public async resume(): Promise<void> {
        const body = '<map name="apama-request"></map>';
        return axios.put(`${this.url}/correlator/debug/progress/run`, { body });
    }

    public async stepIn(): Promise<void> {
        const body = '<map name="apama-request"></map>';
        return axios.put(`${this.url}/correlator/debug/progress/step`, { body });
    }

    public async stepOver(): Promise<void> {
        const body = '<map name="apama-request"></map>';
        return axios.put(`${this.url}/correlator/debug/progress/stepover`, { body });
    }

    public async stepOut(): Promise<void> {
        const body = '<map name="apama-request"></map>';
        return axios.put(`${this.url}/correlator/debug/progress/stepout`, { body });
    }

    public async awaitPause(): Promise<CorrelatorPaused> {
        return axios.get(`${this.url}/correlator/debug/progress/wait`, { timeout: 15000 }) // Timeout has to be smaller than apama's timeout else you get a message in the logs
            .catch((e: { error: { code: string; connect: any; }; }) => {
                // If the await timed out (but not during connection) then just recreate it
                if ((e.error.code === 'ETIMEDOUT' || e.error.code === 'ESOCKETTIMEDOUT') && !e.error.connect) {
                    return this.awaitPause();
                } else {
                    throw e;
                }
            })
            .then((response: string) => new DOMParser().parseFromString(response, 'text/xml'))
            .then((dom: any) => ({
                context: xpath.select1('string(/map[@name="apama-response"]/map[@name="contextprogress"]/prop[@name="context"]//text())', dom),
                contextid: parseInt(xpath.select1('string(/map[@name="apama-response"]/map[@name="contextprogress"]/prop[@name="contextid"]//text())', dom)),
                paused: xpath.select1('string(/map[@name="apama-response"]/map[@name="contextprogress"]/prop[@name="paused"]//text())', dom) === 'true',
                owner: xpath.select1('string(/map[@name="apama-response"]/map[@name="contextprogress"]/prop[@name="owner"]//text())', dom),
                type: xpath.select1('string(/map[@name="apama-response"]/map[@name="contextprogress"]/prop[@name="type"]//text())', dom),
                action: xpath.select1('string(/map[@name="apama-response"]/map[@name="contextprogress"]/prop[@name="action"]//text())', dom),
                instance: parseInt(xpath.select1('string(/map[@name="apama-response"]/map[@name="contextprogress"]/prop[@name="instance"]//text())', dom)),
                monitor: xpath.select1('string(/map[@name="apama-response"]/map[@name="contextprogress"]/prop[@name="monitor"]//text())', dom),
                filename: xpath.select1('string(/map[@name="apama-response"]/map[@name="contextprogress"]/prop[@name="filename"]//text())', dom),
                filehash: xpath.select1('string(/map[@name="apama-response"]/map[@name="contextprogress"]/prop[@name="filehash"]//text())', dom),
                reason: xpath.select1('string(/map[@name="apama-response"]/map[@name="contextprogress"]/prop[@name="reason"]//text())', dom),
                line: parseInt(xpath.select1('string(/map[@name="apama-response"]/map[@name="contextprogress"]/prop[@name="line"]//text())', dom))
            }));
    }

    public async getContextStatuses(): Promise<(CorrelatorContextState | CorrelatorPaused)[]> {
        return axios.get(`${this.url}/correlator/debug/progress`)
            .then((response: string) => new DOMParser().parseFromString(response, 'text/xml'))
            .then((dom: any) => xpath.select('/map[@name="apama-response"]/list[@name="progress"]/map[@name="contextprogress"]', dom))
            // Have to convert back to a string and then back to dom because this xpath implementation only finds from root node
            .then((contextStatusNodes: any[]) => contextStatusNodes.map((contextStatusNode: { toString: () => any; }) => contextStatusNode.toString()))
            .then((contextStatusStrings: any[]) => contextStatusStrings.map((contextStatusString: string) => new DOMParser().parseFromString(contextStatusString, 'text/xml')))
            .then((doms: any[]) => doms.map((dom: any) => {
                const paused = xpath.select1('string(/map/prop[@name="paused"]//text())', dom) === 'true';
                if (paused) {
                    return {
                        context: xpath.select1('string(/map/prop[@name="context"]//text())', dom),
                        contextid: parseInt(xpath.select1('string(/map/prop[@name="contextid"]//text())', dom)),
                        paused,
                        owner: xpath.select1('string(/map/prop[@name="owner"]//text())', dom),
                        type: xpath.select1('string(/map/prop[@name="type"]//text())', dom),
                        action: xpath.select1('string(/map/prop[@name="action"]//text())', dom),
                        instance: parseInt(xpath.select1('string(/map/prop[@name="instance"]//text())', dom)),
                        monitor: xpath.select1('string(/map/prop[@name="monitor"]//text())', dom),
                        filename: xpath.select1('string(/map/prop[@name="filename"]//text())', dom),
                        filehash: xpath.select1('string(/map/prop[@name="filehash"]//text())', dom),
                        reason: xpath.select1('string(/map/prop[@name="reason"]//text())', dom),
                        line: parseInt(xpath.select1('string(/map/prop[@name="line"]//text())', dom))
                    };
                } else {
                    return {
                        context: xpath.select1('string(/map/prop[@name="context"]//text())', dom),
                        contextid: parseInt(xpath.select1('string(/map/prop[@name="contextid"]//text())', dom)),
                        paused
                    };
                }
            }));
    }

    public async getStackTrace(contextid: number): Promise<CorrelatorStackTrace> {
        return axios.get(`${this.url}/correlator/debug/progress/stack/id:${contextid}`)
            .then((response: string) => new DOMParser().parseFromString(response, 'text/xml'))
            .then((dom: any) => ({
                contextid: parseInt(xpath.select1('string(/map[@name="apama-response"]/list[@name="stack"]/prop[@name="contextid"]//text())', dom)),
                monitor: xpath.select1('string(/map[@name="apama-response"]/list[@name="stack"]/prop[@name="monitor"]//text())', dom),
                stackframes: xpath.select('/map[@name="apama-response"]/list[@name="stack"]/map[@name="stackframe"]', dom)
                    // Have to convert back to a string and then back to dom because this xpath implementation only finds from root node
                    .map(node => node.toString())
                    .map(nodeString => new DOMParser().parseFromString(nodeString, 'text/xml'))
                    .map(dom => ({
                        owner: xpath.select1('string(/map/prop[@name="owner"]//text())', dom),
                        type:  xpath.select1('string(/map/prop[@name="type"]//text())', dom),
                        action:  xpath.select1('string(/map/prop[@name="action"]//text())', dom),
                        lineno: parseInt(xpath.select1('string(/map/prop[@name="lineno"]//text())', dom)),
                        filename: xpath.select1('string(/map/prop[@name="filename"]//text())', dom),
                        filehash: xpath.select1('string(/map/prop[@name="filehash"]//text())', dom)
                    }))
            }));
    }

    public async getLocalVariables(contextid: number, frameidx: number): Promise<CorrelatorVariable[]> {
        return axios.get(`${this.url}/correlator/debug/progress/locals/id:${contextid};${frameidx}`)
            .then((response: string) => new DOMParser().parseFromString(response, 'text/xml'))
            .then((dom: any) => xpath.select('/map[@name="apama-response"]/list[@name="locals"]/map[@name="variable"]', dom))
            // Have to convert the found nodes back to a string and then back to dom because this xpath implementation only finds from root node
            .then((nodes: any[]) => nodes.map((node: { toString: () => any; }) => node.toString()))
            .then((nodeStrings: any[]) => nodeStrings.map((nodeString: string) => new DOMParser().parseFromString(nodeString, 'text/xml')))
            .then((doms: any[]) => doms.map((dom: any) => ({
                    name: xpath.select1('string(/map/prop[@name="name"]//text())', dom),
                    type: xpath.select1('string(/map/prop[@name="type"]//text())', dom),
                    value: xpath.select1('string(/map/prop[@name="value"]//text())', dom)
                })
            ));
    }

    public async getMonitorVariables(contextid: number, instance: number): Promise<CorrelatorVariable[]> {
        return axios.get(`${this.url}/correlator/contexts/id:${contextid}/${instance}`)
            .then((response: string) => new DOMParser().parseFromString(response, 'text/xml'))
            .then((dom: any) => xpath.select('/map[@name="apama-response"]/list[@name="mthread"]/map[@name="variable"]', dom))
            // Have to convert the found nodes back to a string and then back to dom because this xpath implementation only finds from root node
            .then((nodes: any[]) => nodes.map((node: { toString: () => any; }) => node.toString()))
            .then((nodeStrings: any[]) => nodeStrings.map((nodeString: string) => new DOMParser().parseFromString(nodeString, 'text/xml')))
            .then((doms: { map: (arg0: (dom: any) => Promise<{ name: any; type: any; value: string; }>) => readonly [unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown]; }) => Promise.all(doms.map((dom: any) => {
                const name = xpath.select1('string(/map/prop[@name="name"]//text())', dom);
                return this.getMonitorVariableValue(contextid, instance, name)
                    .then(value => ({
                        name,
                        type: xpath.select1('string(/map/prop[@name="type"]//text())', dom),
                        value
                    }));
                })
            ));
    }

    public async getMonitorVariableValue(contextid: number, instance: number, variableName: string): Promise<string> {
        return axios.get(`${this.url}/correlator/contexts/id:${contextid}/${instance}/${variableName}`)
            .then((response: string) => new DOMParser().parseFromString(response, 'text/xml'))
            .then((dom: any) => xpath.select1('string(/map[@name="apama-response"]/prop[@name="value"]//text())', dom));
    }

    public async setBreakOnErrors(breakOnErrors: boolean): Promise<void> {
        const body = '<map name="apama-request"></map>';
        if (breakOnErrors) {
            return axios.put(`${this.url}/correlator/debug/breakpoint/errors`, { body });
        } else {
            return axios.delete(`${this.url}/correlator/debug/breakpoint/errors`, { body });
        }
    }
}