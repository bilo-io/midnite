import{aX as C}from"./iframe-B_2RvTEd.js";import{i as D}from"./mock-fetch-aFrr3kfG.js";import{R as N}from"./reply-box-BL5tQYvK.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Dh5MDh54.js";import"./Select-ef7c0426.esm-BQ_X5SLM.js";import"./chevron-down-cvryCvCk.js";import"./check-Dv9jf2XB.js";import"./api-aKWrzv8l.js";var c,p,d,m,v,u,_,y,g,h,f,w,R,S,b,x,E,B,L,k;const{expect:i,userEvent:r,within:A}=__STORYBOOK_MODULE_TEST__,U={title:"Components/ReplyBox",component:N,decorators:[a=>C.jsx("div",{className:"w-96 p-4",children:C.jsx(a,{})})],args:{sessionId:"t1"}},s={},t={args:{compact:!0}},o={beforeEach:()=>D([{match:"/sessions/t1/prompt",json:{ok:!0}}]),play:async({canvasElement:a})=>{const e=A(a),T=e.getByLabelText("Reply to the agent"),l=e.getByRole("button",{name:/send reply/i});await i(l).toBeDisabled(),await r.type(T,"keep going"),await i(l).toBeEnabled(),await r.click(l),await i(T).toHaveValue("")}},n={beforeEach:()=>D([{match:"/sessions/t1/prompt",status:409,json:{message:"no live session"}}]),play:async({canvasElement:a})=>{const e=A(a);await r.type(e.getByLabelText("Reply to the agent"),"hello"),await r.click(e.getByRole("button",{name:/send reply/i})),await i(await e.findByRole("alert")).toHaveTextContent(/no live session/i)}};s.parameters={...s.parameters,docs:{...(c=s.parameters)===null||c===void 0?void 0:c.docs,source:{originalSource:"{}",...(d=s.parameters)===null||d===void 0||(p=d.docs)===null||p===void 0?void 0:p.source},description:{story:"The default inline reply box (detail surfaces).",...(v=s.parameters)===null||v===void 0||(m=v.docs)===null||m===void 0?void 0:m.description}}};t.parameters={...t.parameters,docs:{...(u=t.parameters)===null||u===void 0?void 0:u.docs,source:{originalSource:`{
  args: {
    compact: true
  }
}`,...(y=t.parameters)===null||y===void 0||(_=y.docs)===null||_===void 0?void 0:_.source},description:{story:"Compact variant used inside the board card's quick-reply popover.",...(h=t.parameters)===null||h===void 0||(g=h.docs)===null||g===void 0?void 0:g.description}}};o.parameters={...o.parameters,docs:{...(f=o.parameters)===null||f===void 0?void 0:f.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/sessions/t1/prompt',
    json: {
      ok: true
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Reply to the agent') as HTMLInputElement;
    const send = canvas.getByRole('button', {
      name: /send reply/i
    });
    await expect(send).toBeDisabled();
    await userEvent.type(input, 'keep going');
    await expect(send).toBeEnabled();
    await userEvent.click(send);
    await expect(input).toHaveValue('');
  }
}`,...(R=o.parameters)===null||R===void 0||(w=R.docs)===null||w===void 0?void 0:w.source},description:{story:"Typing enables Send; sending clears the input (status flip is earned via WS).",...(b=o.parameters)===null||b===void 0||(S=b.docs)===null||S===void 0?void 0:S.description}}};n.parameters={...n.parameters,docs:{...(x=n.parameters)===null||x===void 0?void 0:x.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/sessions/t1/prompt',
    status: 409,
    json: {
      message: 'no live session'
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Reply to the agent'), 'hello');
    await userEvent.click(canvas.getByRole('button', {
      name: /send reply/i
    }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent(/no live session/i);
  }
}`,...(B=n.parameters)===null||B===void 0||(E=B.docs)===null||E===void 0?void 0:E.source},description:{story:"A 409 (no live session) surfaces a friendly, actionable message.",...(k=n.parameters)===null||k===void 0||(L=k.docs)===null||L===void 0?void 0:L.description}}};const W=["Default","Compact","SendsAReply","NoLiveSession"];export{t as Compact,s as Default,n as NoLiveSession,o as SendsAReply,W as __namedExportsOrder,U as default};
