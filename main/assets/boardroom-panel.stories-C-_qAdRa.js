import{n as T}from"./iframe-CJ1m4Ybm.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-CckvYj1j.js";import{B as I}from"./boardroom-panel-BIKiM9fH.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-Dn-VHSaA.js";import"./index-CliU6RMt.js";import"./check-Dp1RnyS0.js";import"./project-tag-DoLGdFsr.js";import"./inbound-CbJZzwyX.js";import"./project-modal-Dhm1fB2X.js";import"./export-menu-CYct_o78.js";import"./client-GW6pKhkC.js";import"./markdown-preview-ZX7bDfEA.js";import"./file-text-BwNRTmya.js";import"./copy-CQZ0k87Q.js";import"./loader-circle-DbEkz5fD.js";import"./api-A95bhGP6.js";import"./folder-open-DcrFiXNv.js";import"./folder-GZ_iMT7X.js";import"./tag-color-picker-B__PtJq_.js";import"./source-list-editor-nlSISOTv.js";import"./confirm-dialog-CrGE-Z21.js";import"./triangle-alert-BH4QQAoL.js";import"./source-icon-DmTyxwIs.js";import"./globe-Cx59IRyh.js";import"./sticky-note-ninkO3Rl.js";import"./plus-CWeJpqka.js";import"./external-link-xv-quatx.js";import"./task-row-C4dJyzdP.js";import"./blocked-badge-9ajtvp7l.js";import"./selectable-icon-C9hctgF5.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-wzzB0Kk4.js";import"./pencil-DV-O3SdQ.js";import"./trash-2-DowimOPd.js";import"./refresh-cw-CBvsisjG.js";import"./index-DgnFcoj8.js";import"./lightbulb-DNVDBmLf.js";import"./templates-B6M1OYb3.js";import"./sparkles-Bw7gUbe-.js";import"./brain-n0eLqmDm.js";import"./chevron-right-5pPo8C5n.js";import"./spinner-CbEcuJDb.js";import"./data-refresh-BhN9XNu8.js";import"./useQuery-jfPU_HCC.js";import"./presentation-v6taikjE.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:n,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,Bt={title:"Office/BoardroomPanel",component:I,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:[x,D]},{match:"/tasks",json:k},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await n(await o.findByText(x.name)).toBeInTheDocument(),await n(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:[]},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText("No projects yet.")).toBeInTheDocument()}},r={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
