import{n as T}from"./iframe-kXbbvWEw.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-CckvYj1j.js";import{B as I}from"./boardroom-panel-hLz9skM7.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-Cp5mvDU9.js";import"./index-ByjA7Gfy.js";import"./check-BeSN7jXR.js";import"./project-tag-D_D8f0Ix.js";import"./inbound-CbJZzwyX.js";import"./project-modal-B3_UkYlz.js";import"./export-menu-9g9TgYUB.js";import"./client-CTlpozoZ.js";import"./markdown-preview-CFVDudB0.js";import"./file-text-CwswAI9a.js";import"./copy-DNl2-pzX.js";import"./loader-circle-CuvK1-M5.js";import"./api-A95bhGP6.js";import"./folder-open--MOtCSk2.js";import"./folder-r62TjS2L.js";import"./tag-color-picker-ClwdW2AH.js";import"./source-list-editor-D5h9YQ6m.js";import"./confirm-dialog-CCsTUoMI.js";import"./triangle-alert-Ciuh50R7.js";import"./source-icon-DYoALhQR.js";import"./globe-D3O_2oZt.js";import"./sticky-note-BlGTHavg.js";import"./plus-BBchGkTx.js";import"./external-link-CwC4lBmY.js";import"./task-row-lQtiPlLE.js";import"./blocked-badge-B97D6LAI.js";import"./selectable-icon-DQ-soRVm.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-3h5aBcwd.js";import"./pencil-3yPt6yiI.js";import"./trash-2-L7eRk-xJ.js";import"./refresh-cw-DUANRlQy.js";import"./index-Bny_P3eP.js";import"./lightbulb-Cf-pIRW-.js";import"./templates-B6M1OYb3.js";import"./sparkles-CUNANSBe.js";import"./brain-CblZ24jn.js";import"./chevron-right-E2O7QEXU.js";import"./spinner-nwdlmmLh.js";import"./data-refresh-Cy4G9UtO.js";import"./useQuery-Bje3Y1Df.js";import"./presentation-B_7E25Wb.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:n,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,Bt={title:"Office/BoardroomPanel",component:I,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:[x,D]},{match:"/tasks",json:k},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await n(await o.findByText(x.name)).toBeInTheDocument(),await n(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:[]},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText("No projects yet.")).toBeInTheDocument()}},r={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
