import{n as T}from"./iframe-pMjuI2BH.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-CckvYj1j.js";import{B as I}from"./boardroom-panel-CSKyi7KR.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-6fvQ0VF1.js";import"./index-DJOaXCN-.js";import"./check-BPiI6dyj.js";import"./project-tag-CzBD8z48.js";import"./inbound-B8us280C.js";import"./project-modal-xCCI7-WS.js";import"./export-menu-DSolrcuZ.js";import"./client-wRQ-ccKO.js";import"./markdown-preview-DL_gszda.js";import"./file-text-Ci3FzmdY.js";import"./copy-C_Zj3vvM.js";import"./loader-circle-C72xWuVu.js";import"./api-4WxRUCnO.js";import"./folder-open-C2rn_Ha9.js";import"./folder-iLCZzGH3.js";import"./tag-color-picker-wdEOx87a.js";import"./source-list-editor-CsKnJhKQ.js";import"./confirm-dialog-CYzyadN2.js";import"./triangle-alert-CgKuL9WG.js";import"./source-icon-B_8Kgrbm.js";import"./globe-BbSVfIua.js";import"./sticky-note-D3XcxY0l.js";import"./plus-CnFhhYut.js";import"./external-link-ZMHYr9th.js";import"./task-row-DBrk8Sa2.js";import"./blocked-badge-B2VW4KKP.js";import"./selectable-icon-DUGoSuBs.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-DJOYEhpc.js";import"./pencil-mUQb8oDV.js";import"./trash-2-BvqzFsTx.js";import"./refresh-cw-CGiO1II2.js";import"./index-DvrzW8_s.js";import"./lightbulb-C3gilxTU.js";import"./templates-B6M1OYb3.js";import"./sparkles-CZ_wY-Hr.js";import"./brain-1xAX9awS.js";import"./chevron-right-BWbCgxn3.js";import"./spinner-BlpCu6gs.js";import"./data-refresh-DRWzw2rP.js";import"./useQuery-Cn4E8PqL.js";import"./presentation-BUYeNm_x.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:n,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,Bt={title:"Office/BoardroomPanel",component:I,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:[x,D]},{match:"/tasks",json:k},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await n(await o.findByText(x.name)).toBeInTheDocument(),await n(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:[]},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText("No projects yet.")).toBeInTheDocument()}},r={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    json: [project, projectMinimal]
  }, {
    match: '/tasks',
    json: tasks
  }, {
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('heading', {
      name: 'Board Room'
    })).toBeInTheDocument();
    // The project list loads asynchronously (Promise.all of three endpoints).
    await expect(await canvas.findByText(project.name)).toBeInTheDocument();
    await expect(canvas.getByText(projectMinimal.name)).toBeInTheDocument();
  }
}`,...(i=e.parameters)===null||i===void 0||(m=i.docs)===null||m===void 0?void 0:m.source},description:{story:"The projects hub: a row per active project, with its task count.",...(p=e.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.description}}};a.parameters={...a.parameters,docs:{...(l=a.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    json: []
  }, {
    match: '/tasks',
    json: []
  }, {
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No projects yet.')).toBeInTheDocument();
  }
}`,...(h=a.parameters)===null||h===void 0||(d=h.docs)===null||d===void 0?void 0:d.source},description:{story:"No projects → the empty-state message.",...(u=a.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.description}}};r.parameters={...r.parameters,docs:{...(_=r.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    status: 500
  }, {
    match: '/tasks',
    json: []
  }, {
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/Couldn’t load projects/)).toBeInTheDocument();
  }
}`,...(y=r.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=r.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Tt=["Default","Empty","Error"];export{e as Default,a as Empty,r as Error,Tt as __namedExportsOrder,Bt as default};
