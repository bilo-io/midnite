import{n as T}from"./iframe-Bv7TZnSa.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-CckvYj1j.js";import{B as I}from"./boardroom-panel-dVWXezb8.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-Cax_LvG-.js";import"./index-DK-uwmrl.js";import"./check-kIS44PmB.js";import"./project-tag-DbYQwDsH.js";import"./webhook-Cky58oAp.js";import"./project-modal-DZIQcSb0.js";import"./export-menu-Bc4pvCSv.js";import"./client-Bnps9XAE.js";import"./markdown-preview-D7XjNTTW.js";import"./file-text-DBRj1Ga1.js";import"./copy-DepjiCSH.js";import"./loader-circle-Dq2O1Zuc.js";import"./api-CHjHKUbu.js";import"./folder-open-D9qhVium.js";import"./folder-DNJVyYKX.js";import"./tag-color-picker-BLf_Xvx1.js";import"./source-list-editor-NG4N9YkK.js";import"./confirm-dialog-BnlEy2uN.js";import"./triangle-alert-LbbgvIjV.js";import"./source-icon-B-zDdrzJ.js";import"./globe-BPk9sCnr.js";import"./sticky-note-B9op07TP.js";import"./plus-DRBdmDVr.js";import"./external-link-DEmcJW3p.js";import"./task-row-DxrjOzfM.js";import"./blocked-badge-GNFLfOBG.js";import"./selectable-icon-CSwZYAT7.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-AV8yoCAf.js";import"./pencil-C4XyZO6A.js";import"./trash-2-DC2dNlho.js";import"./refresh-cw-JlfTAf8w.js";import"./index-8Wb0CsfS.js";import"./lightbulb-SdYyfo2i.js";import"./templates-B6M1OYb3.js";import"./sparkles-DPRSCIyE.js";import"./brain-CAcasuPS.js";import"./chevron-right-CT381ACL.js";import"./spinner-CehUVoec.js";import"./data-refresh-51u-u-83.js";import"./useQuery-DPqM3KU6.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:n,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:I,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:[x,D]},{match:"/tasks",json:k},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await n(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await n(await e.findByText(x.name)).toBeInTheDocument(),await n(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:[]},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await n(await e.findByText("No projects yet.")).toBeInTheDocument()}},r={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await n(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(i=o.parameters)===null||i===void 0||(m=i.docs)===null||m===void 0?void 0:m.source},description:{story:"The projects hub: a row per active project, with its task count.",...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.description}}};a.parameters={...a.parameters,docs:{...(l=a.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
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
}`,...(y=r.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=r.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Bt=["Default","Empty","Error"];export{o as Default,a as Empty,r as Error,Bt as __namedExportsOrder,wt as default};
