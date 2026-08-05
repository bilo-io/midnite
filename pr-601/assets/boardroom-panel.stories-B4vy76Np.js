import{a$ as T}from"./iframe-DpLYv7In.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-Dex7jM72.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DeFsB2Vz.js";import"./Select-ef7c0426.esm-CuJlYyHW.js";import"./chevron-down-D-EDesfJ.js";import"./check-3H_gVqTQ.js";import"./project-tag-vuQ21KPQ.js";import"./project-modal-Dxyd-bQe.js";import"./export-menu-D2ySSIhz.js";import"./client-DGG2hc9K.js";import"./markdown-preview-yDx1LLSK.js";import"./index.dom-D_wTd2ti.js";import"./file-text-DbzG9pUF.js";import"./copy-Cp2nSP9o.js";import"./file-code-corner-CvfKAK2z.js";import"./loader-circle-QVoCfomj.js";import"./api-Df-GKKZj.js";import"./folder-open-CVWz3f4p.js";import"./folder-DbKX2tG1.js";import"./tag-color-picker-BV56KZNp.js";import"./sparkles-CNjznyhd.js";import"./brain-AumLSRyT.js";import"./chevron-right-LMo3qbFk.js";import"./markdown-editor-DBBwqLJ0.js";import"./pencil-BhKURG_m.js";import"./trash-2-B0a9sIrd.js";import"./confirm-dialog-C3HXTQiG.js";import"./templates-CP5VT9uT.js";import"./project-template-labels-BNpOgYd3.js";import"./plus-D3u36rTN.js";import"./task-row-Peu1E32Q.js";import"./blocked-badge-B3jNCJzO.js";import"./selectable-icon-Ba_t4HCN.js";import"./hover-expand-button-CG8lNBjs.js";import"./index-pRESN9Zq.js";import"./data-refresh-Cab60OKx.js";import"./rotate-ccw-X7fQifmD.js";import"./play-PPJlR5fh.js";import"./square-terminal-D8e2EbMq.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-B5zNSNl7.js";import"./spinner-URHZoup1.js";import"./task-route-D70_7rUP.js";import"./use-api-data-B-GOXBFb.js";import"./useQuery-CCPaPbrG.js";import"./presentation-CHf1NuXw.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
