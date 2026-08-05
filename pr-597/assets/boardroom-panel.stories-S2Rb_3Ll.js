import{a_ as T}from"./iframe-C0EziqGE.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-SpILR9bg.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BEvkWvz0.js";import"./Select-ef7c0426.esm-CKzJGGse.js";import"./chevron-down-B1RDmclY.js";import"./check-DYnYe0Gg.js";import"./project-tag-RZoON_Ej.js";import"./project-modal-DFC_BfcN.js";import"./export-menu-GG7RajeO.js";import"./client-CKOtHFX9.js";import"./markdown-preview-BMCQSoaN.js";import"./index.dom-D_wTd2ti.js";import"./file-text-BUAjA9mj.js";import"./copy-CizmTPYB.js";import"./file-code-corner-yCyhVc92.js";import"./loader-circle-BtWttYaH.js";import"./api-BZzPZstA.js";import"./folder-open-B7O4sYH6.js";import"./folder-C6rfdXyL.js";import"./tag-color-picker-EkYWNASw.js";import"./sparkles-Cz8X1EnM.js";import"./brain-CaFN2O2W.js";import"./chevron-right-h_wABeVp.js";import"./markdown-editor-Bme_c7ox.js";import"./pencil-MdoJ7Z37.js";import"./trash-2-CC3Sdl_p.js";import"./confirm-dialog-r83CMYqB.js";import"./templates-CryikImz.js";import"./project-template-labels-BuIBIdQP.js";import"./plus-BHDLTMxD.js";import"./task-row-CHrVYOLZ.js";import"./blocked-badge-Cpl4Oz7Z.js";import"./selectable-icon-Az29n93G.js";import"./hover-expand-button-Bf4T8QJA.js";import"./index-eQWQUaJG.js";import"./data-refresh-D3bAKYfC.js";import"./rotate-ccw-CNiAcpIS.js";import"./play-C6vYc9WA.js";import"./square-terminal-CIW1r0wg.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-B6ahq9CK.js";import"./spinner-Cviq0wZN.js";import"./task-route-D70_7rUP.js";import"./use-api-data-bRDn0FM-.js";import"./useQuery-CiHR9xxn.js";import"./presentation-bDqfRRTh.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
