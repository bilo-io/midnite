import{n as T}from"./iframe-ce5oM0AF.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-CckvYj1j.js";import{B as I}from"./boardroom-panel-CnLqsYbs.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-DGARnL0d.js";import"./index-C-D1-SjS.js";import"./check-BrV9_Lvd.js";import"./project-tag-Ct1YiklI.js";import"./inbound-CbJZzwyX.js";import"./project-modal-BrL4C2zg.js";import"./export-menu-jxMf7G0T.js";import"./client-DQ8z1_s7.js";import"./markdown-preview-Bl6ix1qC.js";import"./file-text-DkQNzVvw.js";import"./copy-BMzQ1PtY.js";import"./loader-circle-IIG2BbgX.js";import"./api-A95bhGP6.js";import"./folder-open-BLBsLiMt.js";import"./folder-DAbNizGQ.js";import"./tag-color-picker-CkDAqv3E.js";import"./source-list-editor-CijAUQdi.js";import"./confirm-dialog-BxM--2Of.js";import"./triangle-alert-CztwGkeQ.js";import"./source-icon-VSSqbUt7.js";import"./globe-BjzqgFNh.js";import"./sticky-note-DbwGwMR8.js";import"./plus-BF1Edvfw.js";import"./external-link-Dk83g0A3.js";import"./task-row-Bx9lLFl4.js";import"./blocked-badge-BK71dQN9.js";import"./selectable-icon-DyYGwyi7.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-B8r8yOFg.js";import"./pencil-BmA4LaRE.js";import"./trash-2-DtvSetwc.js";import"./refresh-cw-BchbUz5o.js";import"./index-zNxvhokd.js";import"./lightbulb-CzZwhARf.js";import"./templates-B6M1OYb3.js";import"./sparkles-CwtMY8lX.js";import"./brain-ChCI1wye.js";import"./chevron-right-pfDUL98M.js";import"./spinner-GgGlkGnO.js";import"./data-refresh-Dz7Mq18K.js";import"./useQuery-CLuH6gSn.js";import"./presentation-2JMHxzb_.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:n,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,Bt={title:"Office/BoardroomPanel",component:I,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:[x,D]},{match:"/tasks",json:k},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await n(await o.findByText(x.name)).toBeInTheDocument(),await n(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:[]},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText("No projects yet.")).toBeInTheDocument()}},r={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
