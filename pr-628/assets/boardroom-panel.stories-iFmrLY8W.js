import{b0 as T}from"./iframe-DpvGsIGI.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel--_lcbVc-.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BwVLjzl6.js";import"./Select-ef7c0426.esm-Bn3D-Fhq.js";import"./chevron-down-D5ESyacF.js";import"./check-C_ZAVvUH.js";import"./project-tag-B-DxlXEG.js";import"./project-modal-BxrkNcmM.js";import"./export-menu-B0CxHCQR.js";import"./client-DdILtiSj.js";import"./markdown-preview-B4rVbROM.js";import"./index.dom-D_wTd2ti.js";import"./copy-DFWb55e2.js";import"./file-code-corner-5wDz2yee.js";import"./file-text-BKiGqL54.js";import"./loader-circle-D_PzSu__.js";import"./api-DFwonaxN.js";import"./folder-open-a-szK2Iz.js";import"./folder-B--eAv0y.js";import"./tag-color-picker-DSVXKK6h.js";import"./sparkles-FwqnqOEa.js";import"./brain-CBtHfqSs.js";import"./chevron-right-CGLuzR1x.js";import"./markdown-editor-5SbFz6tS.js";import"./pencil-EvDaZNne.js";import"./trash-2-Cef5tSLd.js";import"./confirm-dialog-CwVKMsXU.js";import"./templates-C87jOOEG.js";import"./project-template-labels-BwSgLLPN.js";import"./plus-DpC33igC.js";import"./task-row-BVRQrSOS.js";import"./blocked-badge-CDJWyQOC.js";import"./selectable-icon-Ba4Fi7Hu.js";import"./hover-expand-button-BL_kQxHw.js";import"./index-BF-UdoqL.js";import"./data-refresh-NzaARjR1.js";import"./rotate-ccw-DWCn94G4.js";import"./play-CTD_Skyx.js";import"./square-terminal-BU462BXx.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-Bs9ocb3Y.js";import"./spinner-BdgRI1wZ.js";import"./task-route-D70_7rUP.js";import"./use-api-data-NkAVS8zl.js";import"./useQuery-CejV5CXU.js";import"./presentation-DsVZ0HHN.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(i=e.parameters)===null||i===void 0||(m=i.docs)===null||m===void 0?void 0:m.source},description:{story:"The projects hub: a row per active project, with its task count.",...(p=e.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.description}}};a.parameters={...a.parameters,docs:{...(l=a.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
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
}`,...(y=n.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=n.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Dt=["Default","Empty","Error"];export{e as Default,a as Empty,n as Error,Dt as __namedExportsOrder,xt as default};
