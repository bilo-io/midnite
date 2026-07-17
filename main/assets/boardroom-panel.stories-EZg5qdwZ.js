import{n as T}from"./iframe-DLK6r6p_.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-DSPoMIPY.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DifjHr3G.js";import"./index-BTkLbjYt.js";import"./Select-ef7c0426.esm-eNKT3OL1.js";import"./chevron-down-CTeTdGaH.js";import"./check-DNPejkj4.js";import"./project-tag-Mkyu5vzR.js";import"./inbound-HnPqdwPM.js";import"./project-modal-BLWl05J-.js";import"./export-menu-Dw7XBbMa.js";import"./client-ChWRUonP.js";import"./markdown-preview-CxiisuC3.js";import"./index.dom-D_wTd2ti.js";import"./file-text-DL2WOuRT.js";import"./copy-BqrAC59_.js";import"./file-code-corner-B3tWSAmC.js";import"./loader-circle-DKeO80Ww.js";import"./api-ztCVvV6I.js";import"./folder-open-BPL2u0Oy.js";import"./folder-CHx6bYSe.js";import"./tag-color-picker-DNp1UMaX.js";import"./sparkles-KGDv3hIL.js";import"./brain-BnlNounN.js";import"./chevron-right-BwKoYlwL.js";import"./markdown-editor-V1QzRVRq.js";import"./pencil-Du_3HytX.js";import"./trash-2-Bp9dk9fz.js";import"./confirm-dialog-CBWu9No6.js";import"./triangle-alert-Bv-TETfa.js";import"./templates-B6M1OYb3.js";import"./plus-UoslZc19.js";import"./task-row-BjgBcOGm.js";import"./blocked-badge-6OM6yI5F.js";import"./selectable-icon-BXAdiTDL.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-F1VlBrrs.js";import"./arrow-left-Mejt1A0O.js";import"./spinner-wIUMpr-Y.js";import"./task-route-D70_7rUP.js";import"./data-refresh-BcGnJJ9P.js";import"./use-api-data-Dr7f46ch.js";import"./useQuery-DpdCDyeu.js";import"./presentation-1u9bXQwp.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,Bt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    json: {
      items: [project, projectMinimal],
      total: 2
    }
  }, {
    match: '/tasks',
    json: {
      items: tasks,
      total: tasks.length
    }
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
    json: {
      items: [],
      total: 0
    }
  }, {
    match: '/tasks',
    json: {
      items: [],
      total: 0
    }
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
}`,...(h=a.parameters)===null||h===void 0||(d=h.docs)===null||d===void 0?void 0:d.source},description:{story:"No projects → the empty-state message.",...(u=a.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.description}}};n.parameters={...n.parameters,docs:{...(_=n.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    status: 500
  }, {
    match: '/tasks',
    json: {
      items: [],
      total: 0
    }
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
}`,...(y=n.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=n.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Tt=["Default","Empty","Error"];export{o as Default,a as Empty,n as Error,Tt as __namedExportsOrder,Bt as default};
