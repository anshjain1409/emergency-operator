import { reactive } from 'vue'; // tiny reactive pattern via Proxy


export const store = {
state: {
selectedCallSid: null,
emergencies: []
},
setEmergencies(list) { this.state.emergencies = list; },
select(callSid) { this.state.selectedCallSid = callSid; }
};