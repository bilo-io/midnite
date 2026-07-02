import{n as s,T as R}from"./iframe-BmmrWt6z.js";import{c as N,q as B,k as x,p as j}from"./fixtures-CckvYj1j.js";import{C as P}from"./confirm-dialog-DhXGMhQf.js";import{P as H}from"./project-modal-g1fmNW7P.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BbnXA0RY.js";import"./Select-ef7c0426.esm-BIfiEPeH.js";import"./check-89hnE8B_.js";import"./triangle-alert-CXtqjutK.js";import"./export-menu-DFz27W3J.js";import"./client-dWj9s-78.js";import"./markdown-preview-zMEboOs3.js";import"./index.dom-D_wTd2ti.js";import"./file-text-bYFYsqF8.js";import"./copy-DY-KA08v.js";import"./file-code-corner-a8ZNFd57.js";import"./loader-circle-DCyZnCLI.js";import"./api-LeAear7y.js";import"./inbound-DGncUCiA.js";import"./folder-open-D2YTh1Zg.js";import"./folder-BMPzbRxw.js";import"./project-tag-DVwvq9_O.js";import"./tag-color-picker-CCIGHsqO.js";import"./source-list-editor-DvbsUYs-.js";import"./core.esm-CHWrMIiw.js";import"./source-icon-D8Q7qOtp.js";import"./globe-BALvPKSc.js";import"./sticky-note-CA1Gdw4D.js";import"./plus-CD62RjWg.js";import"./external-link-C1iGA6IL.js";import"./task-row-CHMVFNUK.js";import"./blocked-badge-zHO3GDn5.js";import"./selectable-icon-CDUn1JGE.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-CzsUt0bc.js";import"./pencil-CmE2qul3.js";import"./trash-2-CQ6iytZd.js";import"./refresh-cw-1cZBVA6i.js";import"./index-BtcMxtyk.js";import"./lightbulb-sZ879_A-.js";import"./templates-B6M1OYb3.js";import"./sparkles-56y28HGC.js";import"./brain-DcfhYbIv.js";import"./chevron-right-7t2WsMtM.js";var n,c,p,m,d,l,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:a}=__STORYBOOK_MODULE_TEST__,ft={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[t=>s.jsx(R,{children:s.jsx(P,{children:s.jsx(t,{})})})]},o={args:{project:null},play:async({canvasElement:t})=>{const e=await a(t).findByRole("dialog",{name:"New project"});await f(a(e).getByLabelText("Title")).toHaveValue("")}},r={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:t})=>{const e=await a(t).findByRole("dialog",{name:"Edit project"});await f(a(e).getByLabelText("Title")).toHaveValue(j.name)}},i={args:{project:j,tasks:[B,x]},play:async({canvasElement:t})=>{const e=await a(t).findByRole("dialog",{name:"Edit project"}),k=a(e).getByRole("tab",{name:/sources/i});await C.click(k),await f(k).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(n=o.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
  args: {
    project: null
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'New project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue('');
  }
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(d=o.parameters)===null||d===void 0||(m=d.docs)===null||m===void 0?void 0:m.description}}};r.parameters={...r.parameters,docs:{...(l=r.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug],
    memories: [memoryProjectScoped],
    onSelectTask: fn()
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue(project.name);
  }
}`,...(u=r.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=r.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};i.parameters={...i.parameters,docs:{...(g=i.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug]
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    const sourcesTab = within(dialog).getByRole('tab', {
      name: /sources/i
    });
    await userEvent.click(sourcesTab);
    await expect(sourcesTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=i.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Sources marks that tab selected.",...(b=i.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const St=["New","Edit","SwitchTab"];export{r as Edit,o as New,i as SwitchTab,St as __namedExportsOrder,ft as default};
